'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import qs from 'qs';

export default function Process(): JSX.Element {
  const router = useRouter();

  const handleFragments = async () => {
    const location = typeof window !== 'undefined' ? window.location : undefined;
    const hash = location?.hash;
    if (hash !== undefined) {
      const fragment = hash.replace(/^#?\/?/, '');
      const accessToken = qs.parse(fragment).id_token?.toString();
      const idToken = qs.parse(fragment).id_token?.toString();
      const refreshToken = qs.parse(fragment).refresh_token?.toString();
      const expiresIn = qs.parse(fragment).expires_in?.toString();
      const state = qs.parse(fragment).state?.toString();
      const tokenType = qs.parse(fragment).token_type?.toString();
  
      const parms = Object.entries({ 
        'access_token': accessToken,
        'id_token': idToken,
        'expires_in': expiresIn,
        'refresh_token': refreshToken,
        state,
        'token_type': tokenType,
      }).map(entry => `${entry[0]}=${entry[1]}`)
        .reduce((acc, cur) => `${acc}&${cur}`);

      console.log(`/oauth/complete?${parms}`);

      return router.push(`/oauth/complete?${parms}`);
    }
    return router.push('/oauth/device/activate');
  };

  useEffect(() => {
    handleFragments();
  }, []);

  return (
    <main></main>
  );
}
