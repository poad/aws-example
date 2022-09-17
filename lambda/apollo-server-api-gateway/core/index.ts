import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { addResolversToSchema } from '@graphql-tools/schema';
import { loadSchemaSync } from '@graphql-tools/load';
import { GraphQLSchema } from 'graphql';
import * as fs from 'fs';
import resolvers from './resolvers';

const schemaFilePath = fs.existsSync('/var/task/schema.graphqls') ? '/var/task/schema.graphqls' : '../schema.graphqls';
const schema = loadSchemaSync(schemaFilePath, {
  loaders: [
    new GraphQLFileLoader(),
  ],
});

const schemaWithResolvers: GraphQLSchema = addResolversToSchema({
  schema,
  resolvers,
});

export default schemaWithResolvers;
