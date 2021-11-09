import { AppProps } from 'next/app';
import * as React from 'react';
import '../styles/main.css';

const App = ({ Component, pageProps }: AppProps): JSX.Element => <Component {...pageProps} />;

export default App;
