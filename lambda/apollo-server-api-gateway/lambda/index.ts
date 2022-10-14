import { ApolloServer } from 'apollo-server-lambda';
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
  context: ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
  }),
});

// eslint-disable-next-line  import/prefer-default-export
export const handler = server.createHandler();
