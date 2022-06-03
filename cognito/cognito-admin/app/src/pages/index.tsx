import { useState } from 'react';
import { AppBar, Box, Button, CssBaseline, Link, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { Amplify } from 'aws-amplify';
import {
  withAuthenticator,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import styles from '../styles/Home.module.css';
import awsconfig from '../aws-config';
import Users from '../components/Users';
import TabPanel from '../components/TabPanel';
import Groups from '../components/Groups';
import { useClient } from 'hooks/useClient';

Amplify.configure(awsconfig);

interface HomeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut: (opts?: any) => Promise<any>
}

const Home = (props?: HomeProps): JSX.Element => {
  const { client, iamClient } = useClient();
  const [value, setValue] = useState<number>(0);

  const endpoint = process.env.NEXT_PUBLIC_AWS_COGNITO_OAUTH_DOMAIN_CONSOLE;
  const idp = process.env.NEXT_PUBLIC_AWS_COGNITO_IDENTITY_PROVIDER !== undefined ? `identity_provider=${process.env.NEXT_PUBLIC_AWS_COGNITO_IDENTITY_PROVIDER}&` : '';
  const redirect = process.env.NEXT_PUBLIC_SIGN_IN_ENDPOINT;
  const clientId = process.env.NEXT_PUBLIC_AWS_WEB_CLIENT_ID_CONSOLE;
  const scopes = process.env.NEXT_PUBLIC_SCOPES;

  const { signOut } = props ? props : { signOut: () => {} };

  const consoleUrl = `${endpoint}/oauth2/authorize?${idp}redirect_uri=${redirect}&response_type=CODE&client_id=${clientId}&scope=${scopes}`;

  const handleChange = (_event: React.SyntheticEvent<Element, Event>, newValue: number) => {
    setValue(newValue);
  };

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
            <Link href={consoleUrl} target="_blank" rel="noopener" underline="none">
              <Typography variant="h6" noWrap >
                <Button sx={{ backgroundColor: '#fff', '&:hover': { 
                  backgroundColor: '#fff176',
                } }}>Console<OpenInNewIcon fontSize='inherit' /></Button>
              </Typography>
            </Link>
            <Typography variant="h6" noWrap >
              <Button onClick={signOut} sx={{ color: '#fff' }}>Sign out</Button>
            </Typography>
          </Toolbar>
        </AppBar>
        {
          client ? (
            <TabPanel value={value} index={0}>
              <Users client={client} page={{ page: 0, rowsPerPage: 10 }} />
            </TabPanel>
          ) : null
        }
        {
          client && iamClient ? (
            <TabPanel value={value} index={1}>
              <Groups client={client} iamClient={iamClient} page={{ page: 0, rowsPerPage: 10 }} />
            </TabPanel>
          ) : null
        }
      </Box>
    </Box>
  );
};

export default withAuthenticator<HomeProps>(Home);
