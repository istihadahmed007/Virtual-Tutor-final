import { Hono } from "hono";
import { serveStatic } from "hono/deno";

const app = new Hono();

// 1) Serve static files from dist
app.use("*", serveStatic({ root: "./dist" }));

// 2) Fallback to index.html for SPA routing
app.get("*", serveStatic({ path: "./dist/index.html" }));

Deno.serve(app.fetch);
