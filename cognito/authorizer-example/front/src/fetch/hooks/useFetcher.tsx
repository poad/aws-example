type Fetcher = (token: string) => Promise<{
  content: any;
  error?: undefined;
} | {
  error: {
    http?: {
      status: number;
      statusText: string;
      bodyText: string | undefined;
    },
    netrowk: boolean,
  };
  content?: undefined;
}>;

const useFetcher = (url: string, method: string, headers?: { [key: string]: string }, body?: string): Fetcher => {
  const fetcher = async (token: string) => {
    try {
      const response = await fetch(
        url,
        {
          method,
          mode: 'cors',
          headers: headers ? { ...headers, authorization: token } : { authorization: token },
          body,
        }
      );

      if (response.ok) {
        return {
          content: await response.json(),
        }
      }
      return {
        error: {
          http: {
            status: response.status,
            statusText: response.statusText,
            bodyText: response.bodyUsed ? await response.text() : undefined
          },
          network: false,
        }
      };
    } catch (e) {
      console.error(e);
      return {
        error: {
          network: true,
        }
      };
    }
  };
  return fetcher;
}

export default useFetcher;
