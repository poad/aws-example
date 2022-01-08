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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut: (opts?: any) => Promise<any>
}

const Home = ({ signOut }: HomeProps): JSX.Element => {
  const [client, setClient] = useState<UserPoolClient | undefined>(undefined);
  const [iamClient, setIamClient] = useState<IamClient | undefined>(undefined);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [value, setValue] = React.useState<number>(0);

  const handleChange = (_event: React.SyntheticEvent<Element, Event>, newValue: number) => {
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
            <Tabs textColor="inherit" indicatorColor="secondary" value={value} onChange={handleChange} sx={{ flexGrow: 1 }} aria-label="menu tabs">
              <Tab label="Users" />
              <Tab label="Groups" />
            </Tabs>
            <Typography variant="h6" noWrap ><Button onClick={signOut} sx={{ color: '#fff' }}>Sign out</Button></Typography>
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
    </Box>
  );
};

export default withAuthenticator(Home);
