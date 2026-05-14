import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";
import fs from "fs";

function injectXmlContent() {
  return {
    name: "inject-xml-content",
    renderChunk(code) {
      const pattern =
        /var\s+(\w+)_TEMPLATE\s+=\s+.*?readFileSync\([^)]*?'([^']+)'[^)]*?\);/g;

      let modifiedCode = code;
      modifiedCode = modifiedCode.replace(
        pattern,
        (match, varName, fileName) => {
          try {
            const xmlContent = fs.readFileSync(
              `node_modules/@patrickkfkan/peer-dial/xml/${fileName}`,
              "utf8",
            );
            return `var ${varName}_TEMPLATE = ${JSON.stringify(xmlContent)};`;
          } catch (err) {
            console.warn(`⚠️ Failed to inject XML: ${fileName}`, err.message);
            return match; // Keep original if failed
          }
        },
      );

      return { code: modifiedCode, map: null };
    },
  };
}

export default {
  input: "service.js",
  output: {
    file: "../dist/service.js",
    format: "cjs",
    sourcemap: true, // ← For debugging
  },
  external: ["@patrickkfkan/peer-dial"], // ← If it should be external
  onwarn(warning) {
    if (warning.code !== "CIRCULAR_DEPENDENCY") {
      console.warn(warning.message);
    }
  },
  plugins: [
    injectXmlContent(),
    replace({
      "Gate.prototype.await = function await(callback)":
        "Gate.prototype.await = function(callback)",
      "Async.prototype.await = function await(callback)":
        "Async.prototype.await = function (callback)",
      delimiters: ["", ""],
      preventAssignment: true,
    }),
    resolve(),
    json(),
    commonjs(),
    babel({
      babelHelpers: "bundled",
      presets: ["@babel/preset-env"],
    }),
  ],
};
