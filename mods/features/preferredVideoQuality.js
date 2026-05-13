import { configRead, configChangeEmitter } from "../config.js";

const SELECTORS = {
  PLAYER: ".html5-video-player",
};

const EVENTS = {
  YT_STATE_CHANGE: "onStateChange",
  CONFIG_CHANGE: "configChange",
};

const CONFIG_KEYS = {
  QUALITY: "preferredVideoQuality",
};

class PreferredQualityHandler {
  #player = null;
  #attachTimeout = null;
  #lastVideoId = null;
  #hasAppliedQuality = false;

  constructor() {
    this.init();
  }

  init() {
    this.#pollForPlayer();
    this.#setupConfigListener();
  }

  #pollForPlayer() {
    clearTimeout(this.#attachTimeout);

    const playerElement = document.querySelector(SELECTORS.PLAYER);

    if (!playerElement) {
      this.#attachTimeout = setTimeout(() => this.#pollForPlayer(), 100);
      return;
    }

    this.#player = playerElement;

    try {
      this.#player.addEventListener(
        EVENTS.YT_STATE_CHANGE,
        this.#handleStateChange,
      );
    } catch (e) {
      console.warn("Could not attach state change listener:", e);
    }

    this.#handleStateChange();
  }

  #setupConfigListener() {
    configChangeEmitter.addEventListener(EVENTS.CONFIG_CHANGE, (ev) => {
      if (ev.detail?.key === CONFIG_KEYS.QUALITY) {
        this.#applyQuality();
      }
    });
  }

  #handleStateChange = () => {
    try {
      const state = this.#player?.getPlayerStateObject?.();
      const videoData = this.#player?.getVideoData?.();
      const videoId = videoData?.video_id;

      if (videoId !== this.#lastVideoId) {
        this.#lastVideoId = videoId;
        this.#hasAppliedQuality = false;
      }

      const isShorts = Object.values(this.#player.getVideoStats?.() || {}).find(
        (a) => a && a === "shortspage",
      );
      if (state?.isPlaying && !this.#hasAppliedQuality && !isShorts) {
        this.#applyQuality();
        this.#hasAppliedQuality = true;
      }
    } catch (e) {
      console.warn("State change handler failed:", e);
    }
  };

  #applyQuality() {
    const preferredQuality = configRead(CONFIG_KEYS.QUALITY);
    if (!preferredQuality || preferredQuality === "auto" || !this.#player)
      return;

    try {
      const quality = this.#determineQuality(preferredQuality);

      if (quality) {
        this.#player.setPlaybackQualityRange(quality, quality);
      }
    } catch (e) {
      console.warn("[PreferredQuality] Failed to apply quality:", e);
    }
  }

  #determineQuality(preference) {
    try {
      const availableQualities = this.#player.getAvailableQualityData?.();
      if (
        !availableQualities ||
        !Array.isArray(availableQualities) ||
        availableQualities.length === 0
      ) {
        return null;
      }

      const getQualityValue = (label) => parseInt(label, 10) || 0;
      const targetValue = getQualityValue(preference);

      const match = availableQualities.find(
        (q) => getQualityValue(q.qualityLabel) === targetValue,
      );

      if (match) {
        return match.quality;
      }

      const sorted = availableQualities.slice().sort((a, b) => {
        const aVal = getQualityValue(a.qualityLabel);
        const bVal = getQualityValue(b.qualityLabel);
        return Math.abs(aVal - targetValue) - Math.abs(bVal - targetValue);
      });

      return sorted[0]?.quality || null;
    } catch (e) {
      console.warn("[PreferredQuality] Quality determination failed:", e);
      return null;
    }
  }
}

try {
  window.preferredVideoQualityHandler = new PreferredQualityHandler();
} catch (e) {
  console.error("PreferredQualityHandler initialization failed:", e);
}
