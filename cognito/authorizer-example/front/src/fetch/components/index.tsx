import { useState } from "react";
import useFetcher from "../hooks/useFetcher";
import Status from "./status";

const entpoint = process.env.NEXT_PUBLIC_REST_API_ENDPOINT_URL;

const Fetch = ({label, token}: {label: string, token?: string}) => {
  const fetcher = useFetcher(entpoint!, 'POST');
  const [status, setStatus] = useState<boolean | undefined>();
  const [contet, setContent] = useState<string>('');

  if (!token) {
    return (<></>);
  }

  return (
    <>
      <button onClick={() => fetcher(token).then(res => {
        setStatus(!res.error);
        setContent(res.content ? JSON.stringify(res.content) : '');
      })}>{label}</button>
      <Status status={status} />
      <>{contet}</>
    </>
  );
};

export default Fetch;
