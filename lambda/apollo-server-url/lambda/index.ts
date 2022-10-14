import { gql, ApolloServer } from 'apollo-server-lambda';

const typeDefs = gql`
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
export const handler = server.createHandler();
