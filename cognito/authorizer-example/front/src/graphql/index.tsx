import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';
import Status from '../fetch/components/status';

const GraphqlFetch = () => {
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
  if (error) return <p><Status status={false} /></p>;
  return (
    <>
      <Status status={true} />
      <div>{JSON.stringify(data)}</div>
    </>
  );
};

export default GraphqlFetch;
