// High-Quality Thumbnails for Focused Items
// Fixes issue where focused thumbnails revert to default quality

import { configRead } from "../config.js";

var THUMBNAIL_URLS = [
  "maxresdefault.jpg",
  "sddefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
  "default.jpg",
];

function extractVideoIdFromThumbnailUrl(url) {
  if (!url) return null;
  if (!url.includes("i.ytimg.com/vi/")) return null;

  var match = url.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
}

var qualityCache = {};

function upgradeThumbnailQuality(element) {
  if (!configRead("enableHqThumbnails")) return;
  if (!element) return;

  var currentUrl = "";
  var isBackgroundImage = false;

  if (element.tagName === "IMG" && element.src) {
    currentUrl = element.src;
  } else if (element.style && element.style.backgroundImage) {
    var bgMatch = element.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (bgMatch && bgMatch[1]) {
      currentUrl = bgMatch[1];
      isBackgroundImage = true;
    }
  }

  if (!currentUrl || !currentUrl.includes("i.ytimg.com/vi/")) return;

  var videoId = extractVideoIdFromThumbnailUrl(currentUrl);
  if (!videoId) return;

  if (element.getAttribute("data-hq-upgraded") === videoId) return;

  var qualityMatch = currentUrl.match(
    /\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.jpg/
  );
  var currentQuality = qualityMatch ? qualityMatch[1] : "default";
  var cachedQuality = qualityCache[videoId];

  if (cachedQuality && currentQuality + ".jpg" === cachedQuality) {
    element.setAttribute("data-hq-upgraded", videoId);
    return;
  }

  var queryArgs = currentUrl.split("?")[1] || "";
  element.setAttribute("data-hq-upgraded", videoId);

  var applyFinalQuality = function (qualityName) {
    var finalUrl = "https://i.ytimg.com/vi/" + videoId + "/" + qualityName + (queryArgs ? "?" + queryArgs : "");
    if (isBackgroundImage) {
      element.style.backgroundImage = 'url("' + finalUrl + '")';
    } else {
      element.removeAttribute("srcset");
      element.src = finalUrl;
    }
  };

  if (cachedQuality) {
    applyFinalQuality(cachedQuality);
    return;
  }

  var maxresUrl = "https://i.ytimg.com/vi/" + videoId + "/maxresdefault.jpg" + (queryArgs ? "?" + queryArgs : "");

  var tester = new Image();
  tester.onload = function () {
    if (this.naturalWidth === 120 && this.naturalHeight === 90) {
      qualityCache[videoId] = "hqdefault.jpg";
      applyFinalQuality("hqdefault.jpg");
    } else {
      qualityCache[videoId] = "maxresdefault.jpg";
      applyFinalQuality("maxresdefault.jpg");
    }
  };
  tester.onerror = function () {
    qualityCache[videoId] = "hqdefault.jpg";
    applyFinalQuality("hqdefault.jpg");
  };
  tester.src = maxresUrl;
}

function initFocusObserver() {
  var observerConfig = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "src", "srcset", "style"],
  };

  var observer = new MutationObserver(function (mutations) {
    try {
      for (var m = 0; m < mutations.length; m++) {
        var mutation = mutations[m];
        var element = mutation.target;

        var findTargetsAndUpgrade = function (container) {
          if (!container || !container.querySelector) return;
          var img = container.querySelector("img");
          if (img) upgradeThumbnailQuality(img);

          var bgElements = container.querySelectorAll('[style*="background-image"]');
          for (var b = 0; b < bgElements.length; b++) {
            upgradeThumbnailQuality(bgElements[b]);
          }

          if (container.style && container.style.backgroundImage) {
            upgradeThumbnailQuality(container);
          }
        };

        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          if (element.classList && element.classList.contains("zylon-focus")) {
            findTargetsAndUpgrade(element);
          }
        }

        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "src" || mutation.attributeName === "srcset" || mutation.attributeName === "style")
        ) {
          var focusedParent = element.closest ? element.closest(".zylon-focus") : null;
          if (focusedParent) {
            var lockedVideoId = element.getAttribute("data-hq-upgraded");

            var liveUrl = "";
            if (element.tagName === "IMG") {
              liveUrl = element.src;
            } else if (element.style && element.style.backgroundImage) {
              var liveMatch = element.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
              liveUrl = liveMatch ? liveMatch[1] : "";
            }
            var liveVideoId = liveUrl ? extractVideoIdFromThumbnailUrl(liveUrl) : null;

            if (lockedVideoId && lockedVideoId === liveVideoId) {
              continue;
            }

            element.removeAttribute("data-hq-upgraded");
            upgradeThumbnailQuality(element);
          }
        }

        if (mutation.type === "childList") {
          for (var n = 0; n < mutation.addedNodes.length; n++) {
            var node = mutation.addedNodes[n];
            if (node.nodeType !== 1) continue;

            var focusedParentNode = null;
            if (node.classList && node.classList.contains("zylon-focus")) {
              focusedParentNode = node;
            } else if (node.closest) {
              focusedParentNode = node.closest(".zylon-focus");
            }

            if (focusedParentNode) {
              findTargetsAndUpgrade(focusedParentNode);
            } else if (node.querySelectorAll) {
              var focusedChildren = node.querySelectorAll(".zylon-focus");
              for (var c = 0; c < focusedChildren.length; c++) {
                findTargetsAndUpgrade(focusedChildren[c]);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("TT Error in hqObserver:", err);
    }
  });

  var container = document.getElementById("container") || document.body;
  observer.observe(container, observerConfig);

  return observer;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(initFocusObserver, 1000);
  });
} else {
  setTimeout(initFocusObserver, 1000);
}

console.log("HQ Thumbnails Focus Observer initialized");
