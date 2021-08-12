import React, { useState, useEffect } from 'react';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Toolbar from '@material-ui/core/Toolbar';
import Amplify, { Auth } from 'aws-amplify';
import Typography from '@material-ui/core/Typography';
import {
  AmplifySignOut,
  withAuthenticator,
} from '@aws-amplify/ui-react';
import {
  makeStyles,
  Theme,
  createStyles,
} from '@material-ui/core/styles';

import { Tab, Tabs } from '@material-ui/core';
import styles from '../styles/Home.module.css';
import awsconfig, { appConfig } from '../aws-config';
import Users from '../components/Users';
import UserPoolClient from '../service/UserPoolClient';
import IamClient from '../service/IamClient';
import TabPanel from '../components/TabPanel';
import Groups from '../components/Groups';

Amplify.configure(awsconfig);

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    display: 'flex',
    color: '#fff',
  },
  appBar: {
    [theme.breakpoints.up('sm')]: {
      width: 'calc(100%)',
    },
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
  toolbar: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  menuItem: {
    color: '#fff',
  },
}));

const Home = (): JSX.Element => {
  const classes = useStyles();

  const [client, setClient] = useState<UserPoolClient | undefined>(undefined);
  const [iamClient, setIamClient] = useState<IamClient | undefined>(undefined);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [value, setValue] = React.useState(0);

  const handleChange = (newValue: number) => {
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
    <div className={classes.root}>
      <div className={styles.main}>
        <CssBaseline />
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar>
            <Typography variant="h6" className={classes.title}>Account manager</Typography>
            <Tabs value={value} onChange={handleChange} className={classes.content} aria-label="menu tabs">
              <Tab label="Users" />
              <Tab label="Groups" />
            </Tabs>
            <Typography variant="h6" color="inherit" noWrap><AmplifySignOut /></Typography>
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
    </div>
  );
};

export default withAuthenticator(Home);
