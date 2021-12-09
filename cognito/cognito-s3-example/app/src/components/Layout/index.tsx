import React from 'react';
import Head from 'next/head';

import Header from '../Header';

interface LayoutProps {
  username?: string,
  children?: React.ReactNode
}

const Layout: React.FunctionComponent<LayoutProps> = (props) => (
  <div>
    <Head>
      <title>Next.js with Cognito and S3</title>
    </Head>

    <Header username={props.username} />

    <main>
      <div className="container">
        {props.children}
      </div>
    </main>

    <style jsx>{`
        .container {
          max-width: 42rem;
          margin: 1.5rem auto;
        }
      `}</style>
    <style jsx global>{`
        body {
          margin: 0;
          color: #333;
          font-family: -apple-system, 'Segoe UI';
        }
      `}</style>
  </div>
);

export default Layout;
