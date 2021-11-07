import React, { useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { CognitoUserInterface } from '@aws-amplify/ui-components';
import qs from 'qs';

const useAuth = (location: string | undefined): { user: CognitoUserInterface | undefined, token: string | undefined } => {
  const [user, setUser] = React.useState<CognitoUserInterface | undefined>();
  const [token, setToken] = React.useState<string | undefined>(undefined);

  const handleAuth = async () => {
    if (location !== undefined) {
      const hash = location.replace(/^#?\/?/, '');
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
    
    try {
      await Auth.currentSession()
        .then(session => setToken(session.getIdToken().getJwtToken()));
    
      await Auth.currentAuthenticatedUser()
        .then(currentUser => {
          setUser(currentUser);
        });
    } catch (e) {
      setToken(undefined);
      setUser(undefined);
    }
  };

  useEffect(() => {
    handleAuth();
  }, []);


  return {
    user,
    token,
  };
};

export default useAuth;
