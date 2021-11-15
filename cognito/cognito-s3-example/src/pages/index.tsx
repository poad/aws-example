import React, { useState, useEffect } from 'react';
import Amplify, { Auth } from 'aws-amplify';

import { AmplifyAuthenticator, AmplifySignIn, AmplifySignOut } from '@aws-amplify/ui-react';
import { AuthState, onAuthUIStateChange, CognitoUserInterface } from '@aws-amplify/ui-components';
import Storage, { S3ProviderListOutput } from '@aws-amplify/storage';

import Layout from 'components/Layout';
import S3Directory from 'components/s3directory';
import styles from '../styles/Home.module.css';
import awsconfig from '../aws-config';

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
      <AmplifyAuthenticator>
        <AmplifySignIn slot="sign-in">
          <div slot="federated-buttons"></div>
          <div slot="secondary-footer-content"></div>
        </AmplifySignIn>

        <main className={styles.main}>

          <div>
            <AmplifySignOut />
          </div>
          <S3Directory s3Objects={list} />
        </main>
      </AmplifyAuthenticator>

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
