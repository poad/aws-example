import React, { useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { CognitoUserInterface } from '@aws-amplify/ui-components';

const useAuth = (): { user: CognitoUserInterface | undefined, token: string | undefined } => {
  const [user, setUser] = React.useState<CognitoUserInterface | undefined>();
  const [token, setToken] = React.useState<string | undefined>(undefined);

  const handleAuth = async () => {    
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
