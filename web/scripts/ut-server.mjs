/*
 * The server for the user test (stage 13b): the real app with the user-test tracker, on port 8040.
 *
 *   1. builds the web app into .ut-dist with VITE_UT_ENDPOINT, so index.html carries the tracker script and track.js
 *      is copied next to it (never `dist`, never the normal build: see vite.config.ts; skip with UT_SKIP_BUILD=1)
 *   2. starts the Python backend on 8040 with the REAL engines (no IC_E2E): the default Ollama (11434) and Kokoro
 *      from the read-only model folder; its own data folder under .tmp/usertest/ic-data of the project
 *   3. stays in the foreground and passes SIGINT / SIGTERM on
 *
 * The collector runs separately (it receives the events), e.g.:
 *   PORT=8787 DATA_DIR=<project>/.tmp/usertest/data node <project>/tools/dashboard/server/server.js
 * Testers open  http://localhost:8040/?ut_task=<scenario>  (the collector may sit behind a tunnel: UT_ENDPOINT).
 *
 * Ports 8000, 8001, 8002, 8010 (e2e), 11434 and 11435 belong to other runs: this script never binds them.
 */
import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolve(web, "..", "server");
const project = resolve(web, "..", "..");
const outDir = join(web, ".ut-dist");
const PORT = process.env.UT_PORT ?? "8040";
const ENDPOINT = process.env.UT_ENDPOINT ?? "http://localhost:8787";
const dataDir = process.env.UT_IC_DATA_DIR ?? join(project, ".tmp", "usertest", "ic-data");
const kokoroDir = process.env.UT_KOKORO_MODEL_DIR ?? "/Users/anna/Documents/project/interview-coach/models";

if (["8000", "8001", "8002", "8010", "11434", "11435"].includes(PORT)) {
  console.error(`ut-server: port ${PORT} is reserved for other runs.`);
  process.exit(1);
}

if (process.env.UT_SKIP_BUILD !== "1" || !existsSync(join(outDir, "index.html"))) {
  console.log(`ut-server: building the web app into .ut-dist (tracker endpoint ${ENDPOINT})`);
  const build = spawnSync("npx", ["vite", "build", "--outDir", ".ut-dist", "--emptyOutDir"], {
    cwd: web, stdio: "inherit", env: { ...process.env, VITE_UT_ENDPOINT: ENDPOINT },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

mkdirSync(dataDir, { recursive: true });
const logFile = join(dirname(dataDir), "ut-server.log");
const log = openSync(logFile, "a");
const python = join(server, ".venv", "bin", "python");
const env = { ...process.env, IC_PORT: PORT, IC_DATA_DIR: dataDir, IC_WEB_DIST: outDir, KOKORO_MODEL_DIR: kokoroDir };
delete env.IC_E2E; // real engines
delete env.VITE_UT_ENDPOINT;
const child = spawn(existsSync(python) ? python : "python3", ["-m", "server", "--port", PORT], {
  cwd: server, stdio: ["ignore", log, log], env,
});
console.log(`ut-server: http://localhost:${PORT}/?ut_task=<scenario>  (events go to ${ENDPOINT}; log ${logFile})`);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  closeSync(log);
  if (code) console.error(`ut-server: the backend exited with code ${code}, see ${logFile}`);
  process.exit(code ?? 0);
});
