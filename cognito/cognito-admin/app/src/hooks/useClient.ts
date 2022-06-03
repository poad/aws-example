import { useMemo } from 'react';
import { Amplify, Auth } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';

import awsconfig, { appConfig } from '../aws-config';
import UserPoolClient from '../service/UserPoolClient';
import IamClient from '../service/IamClient';
import { ICredentials } from '@aws-amplify/core';
import { useAsync } from 'react-async';


Amplify.configure(awsconfig);

export const useClient = (): {
  client?: UserPoolClient,
  iamClient?: IamClient,
  credential?: ICredentials,
  error?: Error,
  isPending: boolean,
} => {
  return useMemo(() => {
    const { value, error, isPending } = useAsync(async () =>
      Auth.currentUserCredentials()
        .then(Auth.essentialCredentials)
        .then((currentCredentials) => {
          const client = new UserPoolClient(
            currentCredentials,
            appConfig.endUserPoolId,
            awsconfig.Auth.region,
          );
          const iamClient = new IamClient(
            currentCredentials,
            awsconfig.Auth.region,
          );
          return { client, iamClient, currentCredentials };
        }));
    return { ...value, error, isPending };
  }, []);
};