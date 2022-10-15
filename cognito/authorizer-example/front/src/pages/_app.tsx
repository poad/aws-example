import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ApolloClient, createHttpLink, InMemoryCache,  ApolloProvider } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const entpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_ENDPOINT_URL;
const httpLink = createHttpLink({
  uri: entpoint,
});

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('token');
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

const App = ({ Component, pageProps }: AppProps): JSX.Element => (
  <ApolloProvider client={client}>
    <Component {...pageProps} />
  </ApolloProvider>
);

export default App;
