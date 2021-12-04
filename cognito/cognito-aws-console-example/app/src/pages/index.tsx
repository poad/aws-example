import React, { useState, useEffect } from 'react';
import Amplify, { Auth } from 'aws-amplify';
import { Link } from '@mui/material';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { CognitoIdentityClient, GetIdCommand, GetOpenIdTokenCommand } from '@aws-sdk/client-cognito-identity';
import { AssumeRoleWithWebIdentityCommand, STSClient, Credentials } from '@aws-sdk/client-sts';
import { SigninToken } from '../interfaces';
import Layout from '../components/Layout';
import styles from '../styles/Home.module.css';
import awsconfig, { appConfig } from '../aws-config';

Amplify.configure(awsconfig);

interface HomeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut: (opts?: any) => Promise<any>
}

const Home = ({ signOut }: HomeProps): JSX.Element => {
  const [signInToken, setSignInToken] = useState<string | undefined>(undefined);

  const selectRole = (idTokenPayload: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [id: string]: any;
  }): string => {
    const preferredRole = idTokenPayload['cognito:preferred_role'];
    if (preferredRole !== undefined) {
      return preferredRole;
    }
    const roles = idTokenPayload['cognito:roles'];
    if (Array.isArray(roles) && roles.filter((item) => typeof item !== 'string').length === 0 && roles.length === 1) {
      return roles[0];
    }
    return appConfig.identityPoolAuthRoleArn;
  };

  const assumeRoleWithWebIdentity = async (): Promise<Credentials | undefined> => {
    try {
      const currentCredentials = await Auth.essentialCredentials(await Auth.currentUserCredentials());
      // console.dir(currentCredentials, { depth: null });
      if (!currentCredentials.authenticated) {
        return undefined;
      }

      const session = await Auth.currentSession();
      if (!session.isValid) {
        return undefined;
      }

      // console.log(`ID Token obj: ${JSON.stringify(session.getIdToken())}`);
      // console.log(`RefreshToken obj: ${JSON.stringify(session.getRefreshToken())}`);
      // console.log(`AccessToken obj: ${JSON.stringify(session.getAccessToken())}`);

      // console.log(`ID Token: ${JSON.stringify(session.getIdToken().decodePayload())}`);
      // console.log(`AccessToken: ${JSON.stringify(session.getAccessToken().decodePayload())}`);

      const cognitoIdToken = session.getIdToken();
      const idToken = cognitoIdToken.getJwtToken();

      const payload = cognitoIdToken.decodePayload();

      const logins: {
        [key: string]: string;
      } = [
        {
          key: `cognito-idp.${awsconfig.Auth.region}.amazonaws.com/${awsconfig.Auth.userPoolId}`,
          value: idToken,
        },
      ]
        .map((entry) => {
          const entity: { [key: string]: string } = {};
          entity[entry.key] = entry.value;
          return entity;
        })
        .reduce((cur, acc) => Object.assign(acc, cur));

      const identityClient = new CognitoIdentityClient({
        region: awsconfig.Auth.region,
        credentials: {
          ...currentCredentials,
        },
      });

      const getIdResp = await identityClient.send(
        new GetIdCommand({
          IdentityPoolId: awsconfig.Auth.identityPoolId,
          Logins: logins,
        }),
      );

      const WebIdentityToken = (
        await identityClient.send(
          new GetOpenIdTokenCommand({
            IdentityId: getIdResp.IdentityId,
            Logins: logins,
          }),
        )
      ).Token;

      const RoleSessionName = payload.preferred_username;

      const RoleArn = selectRole(payload);

      // console.log(`RoleArn: ${RoleArn}`);

      const request = new AssumeRoleWithWebIdentityCommand({
        WebIdentityToken,
        RoleArn,
        RoleSessionName,
        DurationSeconds: 43200,
      });

      return (
        await new STSClient({
          region: awsconfig.Auth.region,
          signingRegion: awsconfig.Auth.region,
        }).send(request)
      ).Credentials;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      throw error;
    }
  };

  useEffect(() => {
    assumeRoleWithWebIdentity()
      .then((credentials: Credentials | undefined) => {
        if (credentials !== undefined) {
          const sessionId = credentials.AccessKeyId;
          const sessionKey = credentials.SecretAccessKey;
          const sessionToken = credentials.SessionToken;

          const session = JSON.stringify({
            sessionId,
            sessionKey,
            sessionToken,
          });
          fetch(`api/?session=${encodeURIComponent(session)}`)
            .then(async (res: Response) => setSignInToken(((await res.json()) as SigninToken).signinToken))
            // eslint-disable-next-line no-console
            .catch(console.error);
        }
      })
      // eslint-disable-next-line no-console
      .catch(console.error);
  }, []);

  return (
    <Layout>
      <div className="hero">
        <main className={styles.main}>
          {signInToken !== undefined ? (
            // eslint-disable-next-line max-len
            <Link
              href={`https://signin.aws.amazon.com/federation?Action=login&Destination=${encodeURIComponent(
                `https://${awsconfig.Auth.region}.console.aws.amazon.com/console/home?region=${awsconfig.Auth.region}#`,
              )}&SigninToken=${signInToken}`}
              target="_blank"
            >
              AWS Managed Console
            </Link>
          ) : (
            ''
          )}
          <button onClick={signOut}>Sign out</button>
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
