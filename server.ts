import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import aiRoutes from './server/aiRoutes.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use('/api', aiRoutes);

  if (!isProduction) {
    // Mount Vite dev middlewares cleanly inside Express in development.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
        return;
      }
      res.status(404).send('Production bundle not built.');
    });
  }

  app.listen(PORT, '0.0.0.0');
}

startServer();
