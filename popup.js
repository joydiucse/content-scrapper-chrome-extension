const API_URL = 'http://localhost:8000/api/posts'

$(document).ready(async function() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            $('#manualLink').val(tab.url);
        }
    } catch (_) {}
    $('#scrapeBtn').on('click', async () => {
        const $statusDiv = $('#status');
        const $resultDiv = $('#result');
        const $imagePreviewDiv = $('#imagePreview');

        $statusDiv.text("Scraping...");
        $resultDiv.hide();
        $imagePreviewDiv.empty();

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                $statusDiv.text("No active tab found.");
                return;
            }

            // Inject script if not already there (safety check, though manifest handles it for matches)
            // For now rely on manifest content_scripts.

            chrome.tabs.sendMessage(tab.id, { action: "scrape" }, async (response) => {
                if (chrome.runtime.lastError) {
                    $statusDiv.text("Error: " + chrome.runtime.lastError.message + ". Try refreshing the page.");
                    return;
                }

                if (response) {
                    if(response.title){
                        $statusDiv.text("Success!");
                    }else{
                        $statusDiv.text("No data found.");
                    }


                    // Format output
                    const output = `
                    <p><b>Title: </b>${response.title}</p>
                    <p><b>URL: </b>${response.url}
                    <p><b>Content Preview:</b></p>
                    <div class="content">
                        ${response.fullContent}
                    </div>
                    <p><b>Images Found: </b>${response.images.length}</p>`;
                    $resultDiv.html(output);
                    $resultDiv.show();

                    // Show image previews (first 10)
                    response.images.slice(0, 10).forEach(img => {
                        if (img.src) {
                            const $imgEl = $('<img>', {
                                src: img.src,
                                title: img.alt || 'Image'
                            });
                            $imagePreviewDiv.append($imgEl);
                        }
                    });

                    try {
                        const srcUrl = response.url || '';
                        const srcName = response.source || '';

                        const imageSrcs = (response.images || [])
                          .map(i => i.src)
                          .filter(u => /^https?:\/\//.test(u))
                          .slice(0, 10);

                        const res = await fetch(API_URL, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                          body: JSON.stringify({
                            title: response.title || 'Untitled',
                            content: response.fullContent || '',
                            source: srcName,
                            source_url: srcUrl,
                            image_urls: imageSrcs,
                            status: 'draft',
                            kind: 'blog',
                          }),
                        });
                        const json = await res.json();
                        if (json && json.ok) {
                            $statusDiv.text("Saved to server (id: " + json.id + ")");
                        } else if (json && json.duplicate) {
                            $statusDiv.text("Already exists (id: " + json.id + ")");
                        } else {
                            $statusDiv.text(json && json.message ? ("Error: " + json.message) : "Save response error");
                        }
                    } catch (err) {
                        $statusDiv.text("Failed to save: " + err.message);
                    }
                } else {
                    $statusDiv.text("No response from content script.");
                }
            });
        } catch (e) {
            $statusDiv.text("Exception: " + e.message);
        }
    });

    $('#sendBtn').on('click', async () => {
        const $statusDiv = $('#status')
        const link = ($('#manualLink').val() || '').toString().trim()
        const title = ($('#manualTitle').val() || '').toString().trim()
        const content = ($('#manualContent').val() || '').toString().trim()
        if (!link || !title) {
            $statusDiv.text('Please provide link and title')
            return
        }
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    source: 'Link',
                    source_url: link,
                    image_urls: [],
                    status: 'draft',
                    kind: 'blog',
                }),
            })
            const json = await res.json()
            if (json && json.ok) {
                $statusDiv.text('Saved to server (id: ' + json.id + ')')
            } else if (json && json.duplicate) {
                $statusDiv.text('Already exists (id: ' + json.id + ')')
            } else {
                $statusDiv.text(json && json.message ? ('Error: ' + json.message) : 'Save response error')
            }
        } catch (err) {
            $statusDiv.text('Failed to save: ' + err.message)
        }
    })
});
