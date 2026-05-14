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

    // ADD: Replace structuredClone with polyfill BEFORE babel processes it
    replace({
      structuredClone: "structuredClonePolyfill",
      preventAssignment: true,
    }),

    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs({
      include: [/node_modules/, /mods/],
      transformMixedEsModules: true,
    }),

    getBabelOutputPlugin({
      babelHelpers: "bundled",
      presets: [
        [
          "@babel/preset-env",
          {
            // Target MUCH older browsers for Tizen 4
            targets: {
              browsers: ["Chrome 40", "Safari 9", "IE 11"],
            },
            // Include ALL transforms, don't skip any
            useBuiltIns: "entry",
            corejs: 3,
            modules: false,
          },
        ],
      ],
      plugins: [
        // Transform optional chaining and nullish coalescing explicitly
        "@babel/plugin-transform-optional-chaining",
        "@babel/plugin-transform-nullish-coalescing-operator",
      ],
    }),

    terser({
      ecma: 5, // Output ES5 for old browsers
      mangle: {
        // Be careful with mangling - keep some names
        reserved: ["structuredClonePolyfill", "h5vcc", "_yttv", "localStorage"],
      },
      compress: {
        // Less aggressive compression for compatibility
        passes: 1,
      },
    }),

    // Final replace to inject structuredClone polyfill
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
