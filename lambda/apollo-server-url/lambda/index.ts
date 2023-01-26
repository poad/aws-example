import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Callback,
  Context,
} from 'aws-lambda';

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

export async function handler(event: APIGatewayProxyEvent, context: Context, callback: Callback<APIGatewayProxyResult>) {
  const apolloHandler = startServerAndCreateLambdaHandler(server, handlers.createAPIGatewayProxyEventRequestHandler(), {
    context: async (currentContext) => ({
      ...currentContext,
      context: {
        ...currentContext,
      },
    }),
  });
  return apolloHandler(event, context, callback);
}

export default handler;
