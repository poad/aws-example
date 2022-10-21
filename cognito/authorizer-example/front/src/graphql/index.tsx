import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';
import Status from '../fetch/components/status';

const GraphQLFetch = () => {
  const { loading, error, data } = useQuery(gql`
  query Query {
    username
    email
    github {
      username
    }
  } 
  `);

  if (loading) return <p>Loading ...</p>;
  if (error) return <div><Status status={false} /></div>;
  return (
    <>
      <Status status={true} />
      <div>{JSON.stringify(data)}</div>
    </>
  );
};

export default GraphQLFetch;
