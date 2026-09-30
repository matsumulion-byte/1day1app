import { defineConfig } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";
export default defineConfig({
  root: "client",
  base: "/apps/2026-09-30/",
  publicDir: false,
  plugins: [
    {
      name: "archive-data-dev",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = (req.url || "")
            .split("?")[0]
            .replace(/^\/apps\/2026-09-30/, "");
          if (!/^\/(apps\.json|sample\.html|screenshots\/[\w.-]+)$/.test(url))
            return next();
          try {
            const data = await readFile(path.join(process.cwd(), url));
            res.setHeader(
              "Content-Type",
              url.endsWith(".json")
                ? "application/json"
                : url.endsWith(".html")
                  ? "text/html"
                  : url.endsWith(".avif")
                    ? "image/avif"
                    : "image/webp",
            );
            res.end(data);
          } catch {
            res.statusCode = 404;
            res.end("Not found");
          }
        });
      },
    },
  ],
  build: {
    outDir: "../.build",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "script.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (a) =>
          a.names.some((n) => n.endsWith(".css"))
            ? "style.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
