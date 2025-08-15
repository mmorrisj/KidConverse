import type { Express } from "express";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import { nanoid } from "nanoid";

/**
 * Simple logger used by your server.
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * DEV-ONLY: attach Vite middlewares.
 * We use a dynamic import so 'vite' is NOT required at runtime in production.
 */
export async function setupVite(app: Express, server: Server) {
  const { createServer } = await import("vite"); // dynamic import → safe for prod image
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Serve index.html from the client source in development
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      // Adjust this if your client entry lives elsewhere
      const clientTemplate = path.resolve(process.cwd(), "client", "index.html");

      // Always reload index.html from disk in dev
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      try {
        // helpful stack traces in dev, if available
        (vite as any).ssrFixStacktrace?.(e as Error);
      } catch {
        // ignore
      }
      next(e);
    }
  });
}

/**
 * PRODUCTION: serve the Vite-built client output.
 * We build to "dist/" (the default or via --outDir), so serve from there.
 */
export function serveStatic(app: Express) {
  const distDir = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(distDir)) {
    throw new Error(
      `Could not find the build directory: ${distDir}. Make sure to run "npm run build" first.`
    );
  }

  app.use(express.static(distDir, { index: "index.html" }));

  // SPA fallback AFTER API routes
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}
