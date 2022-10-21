import { ApolloServer } from '@apollo/server';
import { GatewayEvent, startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import {
  APIGatewayProxyResult, APIGatewayProxyStructuredResultV2, Callback, Context,
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

export async function handler(event: GatewayEvent, context: Context, callback: Callback<APIGatewayProxyStructuredResultV2 | APIGatewayProxyResult>) {
  const apolloHandler = startServerAndCreateLambdaHandler(server, {
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
