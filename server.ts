/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import app from "./api/index";

const PORT = 3000;

// Vite Middleware for development
async function startServer() {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
