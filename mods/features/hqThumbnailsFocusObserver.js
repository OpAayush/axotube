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
} // Global cache to prevent SPA DOM revert flickering
const qualityCache = new Map();

function upgradeThumbnailQuality(element) {
  if (!configRead("enableHqThumbnails")) return;
  if (!element) return;

  let currentUrl = "";
  let isBackgroundImage = false;

  if (element.tagName === "IMG" && element.src) {
    currentUrl = element.src;
  } else if (element.style && element.style.backgroundImage) {
    const match = element.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (match && match[1]) {
      currentUrl = match[1];
      isBackgroundImage = true;
    }
  }

  if (!currentUrl || !currentUrl.includes("i.ytimg.com/vi/")) return;

  const videoId = extractVideoIdFromThumbnailUrl(currentUrl);
  if (!videoId) return;

  if (element.getAttribute("data-hq-upgraded") === videoId) return;

  const qualityMatch = currentUrl.match(
    /\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg/,
  );
  const currentQuality = qualityMatch ? qualityMatch[1] : "default";

  const cachedQuality = qualityCache.get(videoId);

  // If the DOM element is already displaying the correct cached quality, lock it and stop
  if (cachedQuality && currentQuality + ".jpg" === cachedQuality) {
    element.setAttribute("data-hq-upgraded", videoId);
    return;
  }

  const queryArgs = currentUrl.split("?")[1] || "";
  element.setAttribute("data-hq-upgraded", videoId);

  const applyFinalQuality = (qualityName) => {
    const finalUrl = `https://i.ytimg.com/vi/${videoId}/${qualityName}${queryArgs ? `?${queryArgs}` : ""}`;
    if (isBackgroundImage) {
      element.style.backgroundImage = `url("${finalUrl}")`;
    } else {
      element.removeAttribute("srcset");
      element.src = finalUrl;
    }
  };

  // 1. Check Synchronous Cache (Solves the Search Enter overwrite bug)
  if (cachedQuality) {
    applyFinalQuality(cachedQuality);
    return;
  }

  // 2. Duplicate Image Check (Asynchronous)
  const maxresUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg${queryArgs ? `?${queryArgs}` : ""}`;

  const tester = new Image();
  tester.onload = function () {
    if (this.naturalWidth === 120 && this.naturalHeight === 90) {
      qualityCache.set(videoId, "hqdefault.jpg");
      applyFinalQuality("hqdefault.jpg");
    } else {
      qualityCache.set(videoId, "maxresdefault.jpg");
      applyFinalQuality("maxresdefault.jpg");
    }
  };
  tester.onerror = function () {
    qualityCache.set(videoId, "hqdefault.jpg");
    applyFinalQuality("hqdefault.jpg");
  };
  tester.src = maxresUrl;
}

function initFocusObserver() {
  const observerConfig = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "src", "srcset", "style"],
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const element = mutation.target;

      const findTargetsAndUpgrade = (container) => {
        const img = container.querySelector("img");
        if (img) upgradeThumbnailQuality(img);

        const bgElements = container.querySelectorAll(
          '[style*="background-image"]',
        );
        bgElements.forEach(upgradeThumbnailQuality);

        if (container.style && container.style.backgroundImage) {
          upgradeThumbnailQuality(container);
        }
      };

      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        if (element.classList?.contains("zylon-focus")) {
          findTargetsAndUpgrade(element);
        }
      }

      // Automatically strip locks when YouTube's SPA overwrites the attributes natively
      if (
        mutation.type === "attributes" &&
        ["src", "srcset", "style"].includes(mutation.attributeName)
      ) {
        const focusedParent = element.closest(".zylon-focus");
        if (focusedParent) {
          const lockedVideoId = element.getAttribute("data-hq-upgraded");

          let liveUrl = "";
          if (element.tagName === "IMG") {
            liveUrl = element.src;
          } else if (element.style?.backgroundImage) {
            liveUrl =
              (element.style.backgroundImage.match(
                /url\(['"]?(.*?)['"]?\)/,
              ) || [])[1] || "";
          }
          const liveVideoId = liveUrl
            ? extractVideoIdFromThumbnailUrl(liveUrl)
            : null;

          if (lockedVideoId && lockedVideoId === liveVideoId) {
            return;
          }

          element.removeAttribute("data-hq-upgraded");
          upgradeThumbnailQuality(element);
        }
      }

      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const focusedParent = node.classList?.contains("zylon-focus")
            ? node
            : node.closest(".zylon-focus");

          if (focusedParent) {
            findTargetsAndUpgrade(focusedParent);
          } else if (node.querySelectorAll) {
            const focusedChildren = node.querySelectorAll(".zylon-focus");
            focusedChildren.forEach(findTargetsAndUpgrade);
          }
        });
      }
    });
  });

  const container = document.getElementById("container") || document.body;
  observer.observe(container, observerConfig);

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
