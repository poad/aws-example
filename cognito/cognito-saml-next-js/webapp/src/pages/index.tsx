import React from 'react';
import Layout from '../components/Layout';
import { Box } from '@mui/system';
import Amplify, { Auth } from 'aws-amplify';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import awsconfig from '../aws-exports';
import qs from 'qs';
import AuthButton from 'components/AuthButton';

Amplify.configure(awsconfig);

const Home = (): JSX.Element => {

  const [user, setUser] = React.useState<any | undefined>();
  const [token, setToken] = React.useState<string | undefined>(undefined);

  const authHandle = async () => {
    if (window !== undefined) {
      const hash = window.location.hash.replace(/^#?\/?/, '');
      const idToken = qs.parse(hash).id_token?.toString();
      const expiresIn = Number(qs.parse(hash).expires_in?.toString());

      if (idToken !== undefined && idToken.length === 0) {
        Auth.federatedSignIn('AzureAD', {
          token: idToken,
          expires_at: expiresIn,
        }, {
          name: '',
        });
      }
    }
    
    Auth.currentSession()
      .then(session => setToken(session.getIdToken().getJwtToken()));

    Auth.currentAuthenticatedUser()
      .then(currentUser => {
        setUser(currentUser);
      });
  };

  React.useEffect(() => {
    Promise.all([authHandle()]);
  }, []);

  return (
    <Layout>
      {token !== undefined
        ? (user !== undefined
          ? (
            <>
              <Box sx={{ width: '20rem', mt: '3rem' }}>
                <AmplifySignOut />
              </Box>
              <Box sx={{ color: '#2d2d2d', whiteSpace: 'pre-wrap' }}>
                {user.attributes.name}
              </Box>
              <Box sx={{ color: '#2d2d2d', whiteSpace: 'pre-wrap' }}>
                {user.attributes.email}
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
