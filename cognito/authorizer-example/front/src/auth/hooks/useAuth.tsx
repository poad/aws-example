import { useEffect, useState } from "react";
import { Auth } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';

const useAuth = () => {
  const [credentials, setCredentials] = useState<ICredentials>();
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    Auth.currentUserCredentials()
      .then((credentials) => {
        setCredentials(credentials);
        setLoaded(true);
      })
      .catch((error) => setError(error));
  }, []);

  return {
    credentials,
    loaded,
    error,
  };
};

export default useAuth;
