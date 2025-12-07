// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
        try {
            const data = scrapePage();
            sendResponse(data);
        } catch (e) {
            sendResponse({ error: e.message });
        }
    }
    // Return true to indicate we wish to send a response asynchronously (if needed),
    // though here we are synchronous.
    return true;
});

function scrapePage() {
    console.log("Scraping page...");

    const title = document.title;
    const url = window.location.href;

    // Strategy to find the main content
    let contentElement = findContentElement();

    // Extract text
    let text = "";
    if (contentElement) {
        text = contentElement.innerText;
    } else {
        text = document.body.innerText;
    }

    // Extract images from the content element (or body if content not found)
    const rootForImages = contentElement || document.body;
    const imageElements = Array.from(rootForImages.querySelectorAll('img'));

    const images = imageElements.map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth,
        height: img.naturalHeight
    })).filter(img => img.src && !img.src.startsWith('data:') && img.width > 50 && img.height > 50); // Filter out small icons/tracking pixels

    return {
        title,
        url,
        content: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
        fullContent: text,
        images: images
    };
}

function findContentElement() {
    // 1. Try standard semantic tag
    let el = document.querySelector('article');
    if (el) return el;

    // 2. Try common class names or IDs
    const commonSelectors = [
        '[role="main"]',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content',
        '.content',
        '.main'
    ];

    for (const selector of commonSelectors) {
        el = document.querySelector(selector);
        if (el) return el;
    }

    // 3. Fallback: Find the block element with the most text
    // This is a simple heuristic.
    // We can look at direct children of body or a wrapper.
    return document.body;
}
