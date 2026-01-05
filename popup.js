const API_URL = 'http://localhost:8000/api/posts'

$(document).ready(async function() {
    let scrapedData = null;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            $('#manualLink').val(tab.url);
        }
    } catch (_) {}

    // --- Helper Functions ---

    const sendDataToApi = async (data) => {
        const $statusDiv = $('#status');
        $statusDiv.text("Sending to server...");

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data),
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
    };

    const scrapeContent = () => {
        return new Promise(async (resolve, reject) => {
            const $statusDiv = $('#status');
            const $resultDiv = $('#result');
            const $imagePreviewDiv = $('#imagePreview');
            const $sendScrapedBtn = $('#sendScrapedBtn');

            $statusDiv.text("Scraping...");
            $resultDiv.hide();
            $imagePreviewDiv.empty();
            $sendScrapedBtn.hide();
            scrapedData = null;

            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) {
                    $statusDiv.text("No active tab found.");
                    reject("No active tab found.");
                    return;
                }

                chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
                    if (chrome.runtime.lastError) {
                        const errMsg = "Error: " + chrome.runtime.lastError.message + ". Try refreshing the page.";
                        $statusDiv.text(errMsg);
                        reject(errMsg);
                        return;
                    }

                    if (response) {
                        if(response.title){
                            $statusDiv.text("Scrape Success! Ready to send.");
                        }else{
                            $statusDiv.text("No data found.");
                        }

                        // Display Results
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

                        // Image Previews
                        response.images.slice(0, 10).forEach(img => {
                            if (img.src) {
                                const $imgEl = $('<img>', {
                                    src: img.src,
                                    title: img.alt || 'Image'
                                });
                                $imagePreviewDiv.append($imgEl);
                            }
                        });

                        // Prepare Data
                        const srcUrl = response.url || '';
                        const srcName = response.source || '';
                        const imageSrcs = (response.images || [])
                          .map(i => i.src)
                          .filter(u => /^https?:\/\//.test(u))
                          .slice(0, 10);

                        scrapedData = {
                            title: response.title || 'Untitled',
                            content: response.fullContent || '',
                            source: srcName,
                            source_url: srcUrl,
                            image_urls: imageSrcs,
                            status: 'draft',
                            kind: 'blog',
                        };

                        $sendScrapedBtn.show();
                        resolve(scrapedData);
                    } else {
                        $statusDiv.text("No response from content script.");
                        reject("No response from content script.");
                    }
                });
            } catch (e) {
                $statusDiv.text("Exception: " + e.message);
                reject(e.message);
            }
        });
    };

    // --- Event Listeners ---

    // 1. Scrap Only
    $('#scrapeBtn').on('click', async () => {
        try {
            await scrapeContent();
            // Button is shown in scrapeContent
        } catch (e) {
            console.error(e);
        }
    });

    // 2. Scrap & Send
    $('#scrapeSendBtn').on('click', async () => {
        try {
            const data = await scrapeContent();
            if (data) {
                await sendDataToApi(data);
            }
        } catch (e) {
            console.error(e);
        }
    });

    // 3. Send Link
    $('#sendLinkBtn').on('click', async () => {
         const $statusDiv = $('#status');
         $statusDiv.text("Getting tab info...");
         try {
             const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
             if (!tab) {
                 $statusDiv.text("No active tab found.");
                 return;
             }
             const data = {
                 title: tab.title || 'Untitled',
                 content: '', // Empty content for just link
                 source: 'Link',
                 source_url: tab.url,
                 image_urls: [],
                 status: 'draft',
                 kind: 'blog',
             };
             await sendDataToApi(data);
         } catch (e) {
             $statusDiv.text("Error: " + e.message);
         }
    });

    // 4. Send Scraped Data (Hidden button)
    $('#sendScrapedBtn').on('click', async () => {
        if (scrapedData) {
            await sendDataToApi(scrapedData);
        } else {
            $('#status').text("No scraped data to send. Try scraping again.");
        }
    });

    // 5. Manual Send
    $('#sendBtn').on('click', async () => {
        const $statusDiv = $('#status');
        const link = ($('#manualLink').val() || '').toString().trim();
        const title = ($('#manualTitle').val() || '').toString().trim();
        const content = ($('#manualContent').val() || '').toString().trim();

        if (!link || !title) {
            $statusDiv.text('Please provide link and title');
            return;
        }

        const data = {
            title,
            content,
            source: 'Link',
            source_url: link,
            image_urls: [],
            status: 'draft',
            kind: 'blog',
        };

        await sendDataToApi(data);
    });
});
