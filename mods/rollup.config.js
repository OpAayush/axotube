import { string } from "rollup-plugin-string";
import terser from "@rollup/plugin-terser";
import getBabelOutputPlugin from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";

export default {
  input: "userScript.js",
  output: { file: "../dist/userScript.js", format: "iife" },
  plugins: [
    json(),

    string({
      include: "**/*.css",
    }),

    // Replace structuredClone with polyfill BEFORE babel processes it
    replace({
      structuredClone: "structuredClonePolyfill",
      preventAssignment: true,
    }),

    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),

    commonjs({
      // Include node_modules AND our own mods folder (needed for core-js, regenerator-runtime)
      include: [/node_modules/, /mods/],
      transformMixedEsModules: true,
    }),

    getBabelOutputPlugin({
      babelHelpers: "bundled",
      presets: [
        [
          "@babel/preset-env",
          {
            // Target very old Cobalt / Tizen 4 WebKit
            targets: {
              browsers: ["Chrome 40", "Safari 9", "IE 11"],
            },
            // useBuiltIns is intentionally NOT set here – polyfills are
            // injected via explicit 'core-js/stable' + 'regenerator-runtime'
            // imports in userScript.js and bundled by rollup before this
            // output plugin runs.  Setting useBuiltIns: "entry" in an
            // *output* plugin has no effect because import statements are
            // already resolved by the time babel sees the bundle.
            modules: false,

            // Explicitly include transforms that must fire for Tizen 4:
            include: [
              // async/await  →  _asyncToGenerator + generator syntax
              // (generators ARE supported in Chrome 39+, so no regenerator
              //  wrapper is emitted; the regenerator-runtime import is a
              //  safety net for edge-case Cobalt builds that lack generators)
              "@babel/plugin-transform-async-to-generator",
              // Class fields, private methods, etc.
              "@babel/plugin-transform-class-properties",
              // for-of on non-array iterables
              "@babel/plugin-transform-for-of",
              // Object rest/spread
              "@babel/plugin-transform-object-rest-spread",
            ],
          },
        ],
      ],
      plugins: [
        // Optional chaining:  a?.b  →  a == null ? undefined : a.b
        "@babel/plugin-transform-optional-chaining",
        // Nullish coalescing:  a ?? b  →  a != null ? a : b
        "@babel/plugin-transform-nullish-coalescing-operator",
        // Logical assignment:  a ||= b, a &&= b, a ??= b
        "@babel/plugin-transform-logical-assignment-operators",
        // Numeric separators: 1_000  →  1000
        "@babel/plugin-transform-numeric-separator",
      ],
    }),

    terser({
      ecma: 5, // Output ES5 for maximum Tizen 4 compatibility
      mangle: {
        reserved: [
          "structuredClonePolyfill",
          "regeneratorRuntime", // ← must not be mangled; async/await uses it
          "h5vcc",
          "_yttv",
          "localStorage",
        ],
      },
      compress: {
        passes: 1, // Conservative compression to avoid breaking old engines
      },
    }),

    // Inject structuredClone polyfill after all other transforms
    replace({
      structuredClonePolyfill: `(function() {
        if (typeof structuredClone !== 'undefined') return structuredClone;
        return function(obj) {
          try {
            return JSON.parse(JSON.stringify(obj));
          } catch (e) {
            return obj;
          }
        };
      })()`,
      preventAssignment: true,
    }),
  ],
};
