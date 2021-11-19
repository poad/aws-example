import React, { useState, useEffect } from 'react';
import { AppBar, Box, Button, CssBaseline, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import Amplify, { Auth } from 'aws-amplify';
import {
  withAuthenticator,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import styles from '../styles/Home.module.css';
import awsconfig, { appConfig } from '../aws-config';
import Users from '../components/Users';
import UserPoolClient from '../service/UserPoolClient';
import IamClient from '../service/IamClient';
import TabPanel from '../components/TabPanel';
import Groups from '../components/Groups';

Amplify.configure(awsconfig);

interface HomeProps {
  signOut: (opts?: any) => Promise<any>
}

const Home = ({ signOut }: HomeProps): JSX.Element => {
  const [client, setClient] = useState<UserPoolClient | undefined>(undefined);
  const [iamClient, setIamClient] = useState<IamClient | undefined>(undefined);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [value, setValue] = React.useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (newValue: any) => {
    setValue(newValue);
  };

  useEffect(
    () => {
      Auth.currentUserCredentials()
        .then(Auth.essentialCredentials)
        .then((currentCredentials) => {
          setAuthenticated(currentCredentials.authenticated);
          if (currentCredentials.authenticated) {
            setClient(new UserPoolClient(
              currentCredentials,
              appConfig.endUserPoolId,
              awsconfig.Auth.region,
            ));
            setIamClient(new IamClient(
              currentCredentials,
              awsconfig.Auth.region,
            ));
            return currentCredentials;
          }
          return undefined;
        })
        // eslint-disable-next-line no-console
        .catch(console.error);
    }, [authenticated],
  );

  return (
    <Box sx={{ display: 'flex', color: '#fff' }}>
      <Box className={styles.main}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ width: 'calc(100%)' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Account manager</Typography>
            <Tabs value={value} onChange={handleChange} sx={{ flexGrow: 1 }} aria-label="menu tabs">
              <Tab label="Users" />
              <Tab label="Groups" />
            </Tabs>
            <Typography variant="h6" color="inherit" noWrap><Button onClick={signOut}>Sign out</Button></Typography>
          </Toolbar>
        </AppBar>
        {
          client !== undefined ? (
            <TabPanel value={value} index={0}>
              <Users client={client} page={{ page: 0, rowsPerPage: 10 }} />
            </TabPanel>
          ) : null
        }
        {
          client !== undefined && iamClient !== undefined ? (
            <TabPanel value={value} index={1}>
              <Groups client={client} iamClient={iamClient} page={{ page: 0, rowsPerPage: 10 }} />
            </TabPanel>
          ) : null
        }
      </Box>

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
    </Box>
  );
};

export default withAuthenticator(Home);
