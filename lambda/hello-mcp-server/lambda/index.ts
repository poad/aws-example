import { handle } from 'hono/aws-lambda';
import { app } from './app';

// Start the server
export const handler = handle(app);
