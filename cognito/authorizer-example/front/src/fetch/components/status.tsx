const Ststus = ({status}: {status?: boolean}) => {
  if (status === undefined) {
    return (<></>);
  }
  return status ? (<p style={{color: '#090'}}>OK</p>) : (<p style={{color: '#900'}}>NG</p>);
};

export default Ststus;
