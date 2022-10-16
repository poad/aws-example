import { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

export interface Session {
  idToken: {
    token: string,
    expiration: number,
  },
  accessToken: {
    token: string,
    expiration: number,
  },
  refreshToken?: string,
}

const useSession = (): Session | undefined => {
  const [session, setSession] = useState<CognitoUserSession>();

  useEffect(() => {
    Auth.currentSession().then(it => {
      setSession(it);
      localStorage.setItem('token', it.getIdToken().getJwtToken());
    });
  }, []);

  if (session && session.isValid()) {
    return {
      idToken: {
        token: session.getIdToken().getJwtToken(),
        expiration: session.getIdToken().getExpiration(),
      },
      accessToken: {
        token: session.getAccessToken().getJwtToken(),
        expiration: session.getAccessToken().getExpiration(),
      },
      refreshToken: session.getRefreshToken().getToken(),
    }
  }
  return undefined;
};

export default useSession;
