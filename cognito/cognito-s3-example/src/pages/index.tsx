import React, { useState, useEffect } from 'react';
import Amplify, { Auth } from 'aws-amplify';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { AuthState, onAuthUIStateChange, CognitoUserInterface } from '@aws-amplify/ui-components';
import Storage, { S3ProviderListOutput } from '@aws-amplify/storage';

import Layout from 'components/Layout';
import S3Directory from 'components/s3directory';
import styles from '../styles/Home.module.css';
import awsconfig from '../aws-config';
import { Box } from '@mui/material';

Amplify.configure(awsconfig);
// console.log(awsconfig.Storage.AWSS3)

Storage.configure({
  customPrefix: {
    public: '',
    protected: '',
    private: '',
  },
});

const Home = (): JSX.Element => {
  const [, setAuthState] = useState<AuthState | undefined>(undefined);
  const [user, setUser] = useState<CognitoUserInterface | undefined>(undefined);
  useEffect(() => onAuthUIStateChange((nextAuthState, authData) => {
    setAuthState(nextAuthState);
    setUser(authData as CognitoUserInterface);
  }), []);

  const [list, setList] = useState<S3ProviderListOutput>([]);
  useEffect(() => {
    if (user === undefined) {
      Promise.all([Auth.currentAuthenticatedUser().then((u) => setUser(u)).catch((err) => console.log(err))]);
    }

    Promise.all([Storage.list('contents')
      .then((result) => setList(result))
      // eslint-disable-next-line no-console
      .catch((err) => console.log(err))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout username={user?.username}>
      <Box sx={{'.amplify-tabs': {
        'display': 'none',
      }}}>
      <Authenticator>
        {({ signOut }) => (
          <>
            <main className={styles.main}>

              <div>
                <button onClick={signOut}>Sign out</button>
              </div>
              <S3Directory s3Objects={list} />
            </main>
          </>
        )}
      </Authenticator>
      </Box>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <img src="/vercel.svg" alt="Vercel Logo" className={styles.logo} />
        </a>
      </footer>
    </Layout>
  );
};

export default Home;
