import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import * as log4js from 'log4js';
import schemaWithResolvers from '../core';

log4js.configure({
  appenders: { out: { type: 'stdout', layout: { type: 'pattern', pattern: '%m%n' } } },
  categories: { default: { appenders: ['out'], level: 'info' } },
});

const schema = schemaWithResolvers;
const server = new ApolloServer({
  schema,
  introspection: true,
});

// eslint-disable-next-line  import/prefer-default-export
export const handler = startServerAndCreateLambdaHandler(server);

export default handler;
