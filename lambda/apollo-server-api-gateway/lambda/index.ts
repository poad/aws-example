import { ApolloServer } from 'apollo-server-lambda';
import { Logger } from '@aws-lambda-powertools/logger';

import typeDefs from './scheme';
import resolvers from './resolvers';

const logger = new Logger();

logger.error(JSON.stringify(typeDefs));

const server = new ApolloServer({
  typeDefs,
  resolvers,
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
