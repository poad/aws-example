import React from 'react';
import Head from 'next/head';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '../styles/theme';
import '../styles/globals.css';

const App = (props) => {
  const { Component, pageProps } = props;
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
      <Head>
        <title>Home</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* ThemeProvider makes the theme available down the React
          tree thanks to React context. */}

      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
};

/* eslint-disable no-restricted-globals */
App.onRedirectCallback = (appState) => {
  history.state.push(appState && appState.targetUrl ? appState.targetUrl : window.location.pathname);
};
/* eslint-enable no-restricted-globals */

export default App;
