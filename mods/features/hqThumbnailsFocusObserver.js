// High-Quality Thumbnails for Focused Items
// Fixes issue where focused thumbnails revert to default quality

import { configRead } from "../config.js";

const THUMBNAIL_URLS = [
  "maxresdefault.jpg",
  "sddefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
  "default.jpg",
];

function extractVideoIdFromThumbnailUrl(url) {
  if (!url) return null;
  // Only process standard YouTube video thumbnails (i.ytimg.com/vi/...)
  // Ignore playlist, channel, and mix thumbnails from other CDNs
  if (!url.includes("i.ytimg.com/vi/")) return null;

  const match = url.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
}

function upgradeThumbnailQuality(imgElement) {
  if (!configRead("enableHqThumbnails")) return;
  if (!imgElement || !imgElement.src) return;

  // Only process standard video thumbnails
  if (!imgElement.src.includes("i.ytimg.com/vi/")) return;

  const videoId = extractVideoIdFromThumbnailUrl(imgElement.src);
  if (!videoId) return;

  // Check if already upgraded
  if (imgElement.hasAttribute("data-hq-upgraded")) return;

  // Extract current quality level from URL
  const currentQuality = imgElement.src.match(
    /\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg/,
  )
    ? RegExp.$1
    : "default";

  // Don't attempt to upgrade if already at maxres or if it's a non-standard format
  if (currentQuality === "maxresdefault") return;

  const queryArgs = imgElement.src.split("?")[1] || "";

  // Build fallback chain starting from current quality, going up
  const qualityLevels = THUMBNAIL_URLS;
  const currentIndex = qualityLevels.indexOf(currentQuality + ".jpg");

  // Only upgrade if current quality is below maxres (i.e., not already at highest)
  const startIndex = Math.max(
    0,
    currentIndex >= 0 ? currentIndex : qualityLevels.length - 1,
  );
  const upgradedChain = qualityLevels.slice(0, startIndex + 1);

  // Set primary image to maxres with fallback chain
  const newUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg${queryArgs ? `?${queryArgs}` : ""}`;
  imgElement.src = newUrl;

  // Set srcset with fallback chain (in case maxres doesn't exist)
  const srcset = upgradedChain
    .map(
      (filename, index) =>
        `https://i.ytimg.com/vi/${videoId}/${filename}${queryArgs ? `?${queryArgs}` : ""} ${(index + 1) * 100}w`,
    )
    .join(", ");
  imgElement.srcset = srcset;

  // Add error handler to fallback to original quality if maxres doesn't exist
  imgElement.onerror = function () {
    // If maxres fails, try sddefault
    if (this.src.includes("maxresdefault")) {
      this.src = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg${queryArgs ? `?${queryArgs}` : ""}`;
      this.onerror = null; // Prevent infinite loop
    }
  };

  // Mark as upgraded to avoid reprocessing
  imgElement.setAttribute("data-hq-upgraded", "true");
}

function initFocusObserver() {
  const observerConfig = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "src"],
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Check if mutation involves focus state
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        const element = mutation.target;

        // Look for focused tile and upgrade its thumbnail
        if (element.classList?.contains("zylon-focus")) {
          const tileContainer =
            element.closest('[class*="tileRenderer"]') || element;
          const imgElement = tileContainer.querySelector("img");

          if (imgElement && !imgElement.hasAttribute("data-hq-upgraded")) {
            upgradeThumbnailQuality(imgElement);
          }
        }
      }

      // Also catch newly inserted img elements in focused containers
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return; // Skip non-element nodes

          const imgElement =
            node.tagName === "IMG" ? node : node.querySelector?.("img");

          if (imgElement && !imgElement.hasAttribute("data-hq-upgraded")) {
            const focusedParent = imgElement.closest(".zylon-focus");
            if (focusedParent) {
              upgradeThumbnailQuality(imgElement);
            }
          }
        });
      }
    });
  });

  // Start observing the main video container
  const container = document.getElementById("container");
  if (container) {
    observer.observe(container, observerConfig);
  } else {
    // Fallback to body if container not found
    observer.observe(document.body, observerConfig);
  }

  return observer;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initFocusObserver, 1000); // Delay to ensure YouTube TV is initialized
  });
} else {
  setTimeout(initFocusObserver, 1000);
}

console.log("HQ Thumbnails Focus Observer initialized");
