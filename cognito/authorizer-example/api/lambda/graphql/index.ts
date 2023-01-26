import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import {
  APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context,
} from 'aws-lambda';
import * as log4js from 'log4js';
import schemaWithResolvers from './schema';
import 'source-map-support/register';

log4js.configure({
  appenders: { out: { type: 'stdout', layout: { type: 'pattern', pattern: '%m%n' } } },
  categories: { default: { appenders: ['out'], level: 'info' } },
});

const logger = log4js.getLogger();

const schema = schemaWithResolvers;
const server = new ApolloServer({
  schema,
  introspection: true,
  logger,
});

export async function handler(event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) {
  const apolloHandler = startServerAndCreateLambdaHandler(server, handlers.createAPIGatewayProxyEventRequestHandler(), {
    context: async (currentContext) => ({
      ...currentContext,
      context: {
        ...currentContext,
      },
    }),
  });
  const resp = await apolloHandler(event, context, callback);
  return {
    ...resp,
    headers: {
      ...resp?.headers,
      'Access-Control-Allow-Origin': '*',
    },
  };
}

export default handler;
