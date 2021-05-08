import React, { useState, useEffect } from 'react';
import Amplify, { Auth } from 'aws-amplify';
import {
  withAuthenticator,
} from '@aws-amplify/ui-react';
import Layout from '../components/Layout';
import styles from '../styles/Home.module.css';
import awsconfig from '../aws-config';
import { CognitoUser } from 'amazon-cognito-identity-js';
import Users from 'components/users';
import { User } from 'interfaces';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { ICredentials } from '@aws-amplify/core';

Amplify.configure(awsconfig);

const Home = (): JSX.Element => {
  const [currentAuthenticatedUser, setCurrentAuthenticatedUser] = useState<CognitoUser | undefined>(undefined);
  const [currentUserCredentials, setCurrentUserCredentials] = useState<ICredentials | undefined>(undefined);
  const [client, setClient] = useState<CognitoIdentityProviderClient | undefined>(undefined);
  const [users, setUsers] = useState<User[] | undefined>(undefined);

  const listUsers = async (): Promise<User[] | undefined> => {
    if (client === undefined) {
      return undefined;
    }
    const users = await client.send(new ListUsersCommand({
      UserPoolId: awsconfig.Auth.userPoolId
    }));
    return users !== undefined ? users.Users?.map(user => ({
      username: user.Username,
      attributes: user.Attributes?.map(attribute => ({
        name: attribute.Name,
        value: attribute.Value
      })),
      createdAt: user.UserCreateDate,
      lstModifiedAt: user.UserLastModifiedDate,
      enabled: user.Enabled,
      status: user.UserStatus,
      mfa: user.MFAOptions?.map(mfaOption => ({
        deliveryMedium: mfaOption.DeliveryMedium,
        ttributeName: mfaOption.AttributeName
      })),
    } as User)) : undefined;
  }


  useEffect(
    () => {
      Auth.currentAuthenticatedUser({ bypassCache: false })
        .then((user: CognitoUser) => setCurrentAuthenticatedUser(user));

      Auth.currentUserCredentials()
        .then(Auth.essentialCredentials)
        .then(currentCredentials => {
          if (currentCredentials.authenticated) {
            setCurrentUserCredentials({ ...currentCredentials });
            return currentCredentials;
          } else {
            return undefined;
          }
        });
      if (currentUserCredentials !== undefined) {
        setClient(new CognitoIdentityProviderClient({
          region: awsconfig.Auth.region,
          credentials: currentUserCredentials
        }));

        listUsers().then(userList => {
          if (userList !== undefined) { setUsers(userList) }
        }).catch(console.error);
      }
    }, [currentUserCredentials],
  );

  return (
    <Layout user={currentAuthenticatedUser}>
      <div className="hero">
        <main className={styles.main}>
          <Users users={users || []} />
        </main>
      </div>

      <style jsx>{`
          .hero {
            width: 100%;
            color: #333;
          }
          .title {
            margin: 0;
            width: 100%;
            padding-top: 80px;
            line-height: 1.15;
            font-size: 48px;
          }
          .title,
          .description {
            text-align: center;
          }
          .row {
            max-width: 880px;
            margin: 80px auto 40px;
            display: flex;
            flex-direction: row;
            justify-content: space-around;
          }
          .card {
            padding: 18px 18px 24px;
            width: 220px;
            text-align: left;
            text-decoration: none;
            color: #434343;
            border: 1px solid #9b9b9b;
          }
          .card:hover {
            border-color: #067df7;
          }
          .card h3 {
            margin: 0;
            color: #067df7;
            font-size: 18px;
          }
          .card p {
            margin: 0;
            padding: 12px 0 0;
            font-size: 13px;
            color: #333;
          }
        `}</style>
    </Layout>
  );
};

export default withAuthenticator(Home);
