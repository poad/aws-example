import React from 'react';
import Layout from '../components/Layout';
import { Box } from '@mui/system';
import Amplify from 'aws-amplify';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import awsconfig from '../aws-exports';
import AuthButton from 'components/AuthButton';
import useAuth from 'components/hooks/useAuth';

Amplify.configure(awsconfig);

const Home = (): JSX.Element => {

  const auth = useAuth();

  return (
    <Layout>
      {auth?.token !== undefined
        ? (auth?.user !== undefined
          ? (
            <>
              <Box sx={{ width: '20rem', mt: '3rem' }}>
                <AmplifySignOut />
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
        )
      }
    </Layout>
  );
};

export default Home;
