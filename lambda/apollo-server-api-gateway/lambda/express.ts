import { ApolloServer } from 'apollo-server';
import {
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';

import typeDefs from './scheme';
import resolvers from './resolvers';

async function startApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });
  const { url } = await server.listen();
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at ${url}`);
}

startApolloServer();
