import React from 'react';
import Layout from '../components/Layout';
import { Box } from '@mui/system';
import { Amplify } from 'aws-amplify';
import { Authenticator, Button } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsconfig from '../aws-exports';
import AuthButton from 'components/AuthButton';
import useAuth from 'hooks/useAuth';

Amplify.configure(awsconfig);

const Home = (): JSX.Element => {

  const auth = useAuth();

  return (
    <Layout>
      <Authenticator>
        {
          (authenticator) => {
            return authenticator?.signOut !== undefined && auth?.token !== undefined
              ? (auth?.user !== undefined
                ? (
                  <>
                    <Box sx={{ width: '20rem', mt: '3rem' }}>
                      <Button onClick={authenticator.signOut}>Sign Out</Button>
                    </Box>
                    <Box sx={{ color: '#2d2d2d', whiteSpace: 'pre-wrap' }}>
                      {auth.user.attributes.name}
                    </Box>
                    <Box sx={{ color: '#2d2d2d', whiteSpace: 'pre-wrap' }}>
                      {auth.user.attributes.email}
                    </Box>
                  </>
                )
                : (<></>))
              : (
                <>
                  <Box sx={{ width: '20rem', mt: '3rem' }}>
                    <AuthButton />
                  </Box>
                </>
              );
          }
        }
      </Authenticator>
    </Layout>
  );
};

export default Home;
