import { gql } from 'apollo-server-lambda';

const typeDefs = gql`
type Dump {
  message: String,
  headers: String!
}

type Query {
  hello(message: String): String!
  dump(message: String): Dump!
}
`;

export default typeDefs;
