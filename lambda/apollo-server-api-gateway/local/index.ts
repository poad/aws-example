import { ApolloServer } from 'apollo-server';
import {
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';

import schemaWithResolvers from '../core';

async function startApolloServer() {
  const schema = schemaWithResolvers;
  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });

  const { url } = await (await server).listen();
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at ${url}`);
}

startApolloServer();
