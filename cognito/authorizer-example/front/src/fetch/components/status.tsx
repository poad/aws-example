const Ststus = ({status}: {status?: boolean}) => {
  if (status === undefined) {
    return (<></>);
  }
  return status ? (<div style={{color: '#090'}}>OK</div>) : (<div style={{color: '#900'}}>NG</div>);
};

export default Ststus;
