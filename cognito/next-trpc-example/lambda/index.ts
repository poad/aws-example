import * as trpc from '@trpc/server';
import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda';
import type { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { pokemon } from './routers';

function createContext({
  event,
  context,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEvent>) {
  return {
    event,
    context,
    apiVersion: (event as { version?: string }).version || '1.0',
  };
}

type Context = trpc.inferAsyncReturnType<typeof createContext>;

const t = trpc.initTRPC.context<Context>().create();

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  pokemon: publicProcedure.query(pokemon),
});

export type AppRouter = typeof appRouter;

export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
  responseMeta() {
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST',
        'Access-Control-Allow-Headers': 'authorization',
        'Content-Type': 'application/json; charset=UTF-8',
      },
    };
  },
});
