import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';

const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello, World!',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !!process.env.IS_LOCAL,
});

// eslint-disable-next-line import/prefer-default-export
export const handler = startServerAndCreateLambdaHandler(server, {
  context: async ({ event, context }) => ({
    event,
    context,
  }),
});
