import { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

// https://github.com/vercel/next.js/pull/31939
import Document from 'next/dist/pages/_document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    return initialProps;
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
