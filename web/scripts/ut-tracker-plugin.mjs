/* User test build only (stage 13b, `npm run ut`): with VITE_UT_ENDPOINT set (the collector, e.g. http://localhost:8787)
 * the tracker script is added to index.html and track.js is copied next to it. Unset, vite.config.ts does not load this
 * plugin at all: a normal build has no tracker file and no script tag. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../../../tools/dashboard/tracker/track.js");

export function userTestTracker(endpoint) {
  return {
    name: "ic-user-test-tracker",
    apply: "build",
    buildStart() {
      if (!existsSync(source)) this.error(`VITE_UT_ENDPOINT is set but the tracker is missing: ${source}`);
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "track.js", source: readFileSync(source, "utf8") });
    },
    transformIndexHtml() {
      // The app names its screens from effects, after the first paint: until then the tracker must see "pending",
      // not the path, or every visit would open with a pageview of the wrong screen.
      return [{
        tag: "script",
        children: 'document.documentElement.setAttribute("data-ut-screen","pending");',
        injectTo: "head-prepend",
      }, {
        tag: "script",
        attrs: { src: "/track.js", "data-endpoint": `${endpoint.replace(/\/+$/, "")}/collect` },
        injectTo: "body",
      }];
    },
  };
}
