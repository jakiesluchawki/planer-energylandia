import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function releaseId() {
  const candidate = process.env.GITHUB_SHA || (() => {
    try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "dev"; }
  })();
  return /^[a-f0-9]{7,40}$/i.test(candidate) ? candidate.slice(0, 12).toLowerCase() : "dev";
}

function releasePlugin(release) {
  return {
    name: "pogodapark-release",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || "/", "http://localhost").pathname;
        if (!pathname.endsWith("/release.json")) return next();
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.setHeader("cache-control", "no-store");
        response.end(JSON.stringify({ release }));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "release.json", source: `${JSON.stringify({ release })}\n` });
    },
    async closeBundle() {
      const manifestPath = resolve("dist/manifest.webmanifest");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.id = "./";
      manifest.start_url = release === "dev" ? "./" : `./?r${release}`;
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

const release = releaseId();

export default defineConfig({
  base: "./",
  define: {
    __APP_RELEASE__: JSON.stringify(release),
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    proxy: {
      "/api/queues": {
        target: "https://queue-times.com",
        changeOrigin: true,
        rewrite: () => "/parks/317/queue_times.json",
      },
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), releasePlugin(release)],
});
