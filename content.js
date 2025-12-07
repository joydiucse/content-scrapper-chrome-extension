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
    return true; // Allows async response
});

function scrapePage() {
    const hostname = window.location.hostname;

    if (hostname.includes("laravel-news.com")) {
        return scrapeWebsite({
            contentSelector: ".prose",
            imageRootSelector: "article"
        });
    }

    if (hostname.includes("thehackernews.com")) {
        return scrapeWebsite({
            contentSelector: ".articlebody",
            imageRootSelector: ".articlebody" // FIXED — your selector was wrong before
        });
    }

    return { error: "Website not supported." };
}

/**
 * Generic reusable scraper
 */
function scrapeWebsite({ contentSelector, imageRootSelector }) {
    const title = document.title;
    const url = window.location.href;

    const contentElement = document.querySelector(contentSelector);
    const rootForImages = document.querySelector(imageRootSelector);

    // Extract content safely
    const htmlText = contentElement?.innerHTML || "";

    // Extract images
    const images = [...(rootForImages?.querySelectorAll("img") || [])]
        .map(img => ({
            src: img.src,
            alt: img.alt || "",
            width: img.naturalWidth,
            height: img.naturalHeight
        }))
        .filter(img =>
            img.src &&
            !img.src.startsWith("data:") &&
            img.width > 50 &&
            img.height > 50
        );

    return {
        title,
        url,
        content: htmlText.slice(0, 1000) + (htmlText.length > 1000 ? "..." : ""),
        fullContent: htmlText,
        images
    };
}
