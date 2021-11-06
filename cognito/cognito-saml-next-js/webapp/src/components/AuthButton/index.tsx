import React from 'react';
import { Button } from '@mui/material';
import appConfig from '../../app-config';
import crypto from 'crypto';

const AuthButton = (): JSX.Element => {
  const domain = appConfig.auth.oauth.domain;
  const idpName = appConfig.identityProviderName;
  const loginRedirectUrl = appConfig.auth.oauth.redirectSignIn;
  const clientAppId = appConfig.auth.userPoolWebClientId;

  const onClick = (): void => {
    const hash = crypto
      .createHash('sha1')
      .update(Buffer.from(new Date().getTime().toString())).digest('hex');
    const endpoint = `https://${domain}/oauth2/authorize`;
    const parms = Object.entries({
      ['identity_provider']: idpName,
      ['redirect_uri']: loginRedirectUrl,
      ['response_type']: 'token',
      ['client_id']: clientAppId,
      ['scope']: 'openid+profile+aws.cognito.signin.user.admin',
      ['state']: hash,
    }).map(entry => `${entry[0]}=${entry[1]}`)
      .reduce((acc, cur) => `${acc}&${cur}`);

    const uri = `${endpoint}?${parms}`;
    if (window !== undefined) {
      window.location.href = uri;
    }
  };

  return (
    <Button onClick={onClick} sx={
      {
        textTransform: 'none',
        bgcolor: '#ff8c00',
        color: '#fff',
        '&:hover': {
          backgroundColor: '#ffd700', color: '#2d2d2d',
        },
      }
    }>Sign in with {idpName}</Button>
  );
};

export default AuthButton;
