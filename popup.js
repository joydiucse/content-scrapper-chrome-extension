document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const imagePreviewDiv = document.getElementById('imagePreview');
  
  statusDiv.textContent = "Scraping...";
  resultDiv.style.display = 'none';
  imagePreviewDiv.innerHTML = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      statusDiv.textContent = "No active tab found.";
      return;
    }

    // Inject script if not already there (safety check, though manifest handles it for matches)
    // For now rely on manifest content_scripts.
    
    chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = "Error: " + chrome.runtime.lastError.message + ". Try refreshing the page.";
        return;
      }

      if (response) {
        statusDiv.textContent = "Success!";
        
        // Format output
        const output = `Title: ${response.title}\nURL: ${response.url}\n\nContent Preview:\n${response.content}\n\nImages Found: ${response.images.length}`;
        resultDiv.textContent = output;
        resultDiv.style.display = 'block';

        // Show image previews (first 10)
        response.images.slice(0, 10).forEach(img => {
          if (img.src) {
            const imgEl = document.createElement('img');
            imgEl.src = img.src;
            imgEl.title = img.alt || 'Image';
            imagePreviewDiv.appendChild(imgEl);
          }
        });
      } else {
        statusDiv.textContent = "No response from content script.";
      }
    });
  } catch (e) {
    statusDiv.textContent = "Exception: " + e.message;
  }
});
