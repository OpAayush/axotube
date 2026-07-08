/**
 * userScript.js – TizenTube entry point.
 *
 * Import order matters for Tizen 4 (N5470 / Cobalt) compatibility:
 *  1. core-js/stable  – polyfills for ALL stable ES built-ins (Array, Object,
 *                       String, Promise, Map, Set, Symbol, …)
 *  2. regenerator-runtime – makes async / await work after Babel transforms
 *                           them to generator code on pre-ES2017 engines
 *  3. polyfills.js    – browser-API polyfills NOT covered by core-js
 *                       (EventTarget ctor, AbortController, CustomEvent, etc.)
 *  4. whatwg-fetch    – fetch() polyfill
 *  5. app modules     – everything else
 */

// ── 1. core-js: full ES stable polyfill suite ─────────────────────────────────
// Replaces the old narrow import: 'core-js/proposals/object-getownpropertydescriptors'
// Covers: Array.flat/flatMap, Object.entries/values/fromEntries,
//         String.replaceAll, Promise.finally/allSettled, Map, Set, Symbol, …
import 'core-js/stable';

// ── 2. Async / await runtime (needed by sponsorblock.js, updater.js, etc.) ────
import 'regenerator-runtime/runtime';

// ── 3. Browser-API polyfills (EventTarget ctor, AbortController, …) ───────────
import './polyfills.js';

// ── 4. Fetch polyfill ─────────────────────────────────────────────────────────
import 'whatwg-fetch';

// ── 5. Application modules ────────────────────────────────────────────────────
import './features/userAgentSpoofing.js';
import './translations/index.js';
import './domrect-polyfill';

import './features/adblock.js';
import './features/hqThumbnailsFocusObserver.js';
import './features/sponsorblock.js';
import './ui/ui.js';
import './ui/speedUI.js';
import './ui/theme.js';
import './ui/settings.js';
import './ui/disableWhosWatching.js';
import './features/moreSubtitles.js';
import './features/updater.js';
import './features/pictureInPicture.js';
import './features/preferredVideoQuality.js';
import './features/videoQueuing.js';
import './features/enableFeatures.js';
import './ui/customUI.js';
import './ui/customGuideAction.js';
import './features/autoFrameRate.js';
import './features/premiumLogo.js';