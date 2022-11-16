import React, { useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { AmplifyUser } from '@aws-amplify/ui';

const useAuth = (): { user: AmplifyUser | undefined, token: string | undefined } => {
  const [user, setUser] = React.useState<AmplifyUser | undefined>();
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
