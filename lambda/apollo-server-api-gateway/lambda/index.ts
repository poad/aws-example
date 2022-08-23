import { ApolloServer } from 'apollo-server-lambda';
import schemaWithResolvers from '../core';

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
