import { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../styles/theme';

const App = (props: AppProps): JSX.Element => {
  const { Component, pageProps } = props;
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
      <Head>
        <title>Account manager</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* ThemeProvider makes the theme available down the React
          tree thanks to React context. */}

      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
};

App.componentDidMount = (): void => {
  // Remove the server-side injected CSS.
  const jssStyles = document.querySelector('#jss-server-side');
  if (jssStyles && jssStyles.parentNode) {
    jssStyles.parentNode.removeChild(jssStyles);
  }
};

export default App;
