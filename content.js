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
    const hostname = window.location.hostname;

    let content = {}
    if (hostname.includes('laravel-news.com')) {
        content = scrapLaravelNews()
    }
    return content;

}

function findLaravelNewsContentElement() {
    // 1. Try standard semantic tag
    let $el = $('.prose');
    if ($el.length) return $el;

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
        $el = $(selector);
        if ($el.length) return $el;
    }

    // 3. Fallback: Find the block element with the most text
    return $('body');
}


function scrapLaravelNews() {
    const title = document.title;
    const url = window.location.href;

    // Strategy to find the main content
    let $contentElement = $('.prose');

    // Extract text
    let text = $contentElement.html();

    // Extract images from the content element (or body if content not found)
    const $rootForImages = $('article');
    
    const images = $rootForImages.find('img').map(function() {
        return {
            src: this.src,
            alt: this.alt || '',
            width: this.naturalWidth,
            height: this.naturalHeight
        };
    }).get().filter(img => img.src && !img.src.startsWith('data:') && img.width > 50 && img.height > 50); // Filter out small icons/tracking pixels

    return {
        title,
        url,
        content: text.substring(0, 1000) + (text.length > 1000 ? "..." : ""),
        fullContent: text,
        images: images
    };
}
