import { Box, Typography } from '@material-ui/core';
import React from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FunctionComponent<TabPanelProps> = (props): JSX.Element => {
  const {
    children, value, index, ...other
  } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3} component='div'>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
};

export default TabPanel;
