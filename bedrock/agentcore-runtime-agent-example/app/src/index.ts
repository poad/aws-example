import { app } from './app.js';
import { serve } from '@hono/node-server';

const PORT = Number.parseInt(process.env.PORT ?? '8080');

const server = serve(
  { ...app, port: PORT }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  });

// graceful shutdown
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
