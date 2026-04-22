import { app } from './app';
import { handle } from 'hono/aws-lambda';

// Start the server
export const handler = handle(app);
