import { AppBar, Button, Link, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import '@aws-amplify/ui-react/styles.css';

interface HeaderProps {
  /**
  * Injected by the documentation to work in an iframe.
  * You won't need it on your project.
  */
  container?: Element,
  tab: number,
  consoleUrl: string,
  handleChange: (_event: React.SyntheticEvent<Element, Event>, newValue: number) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut: (opts?: any) => void,
}

export const Header = ({
  tab,
  consoleUrl,
  handleChange,
  signOut,
}: HeaderProps) => (
  <AppBar position="fixed" sx={{ width: 'calc(100%)' }}>
    <Toolbar>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>Account manager</Typography>
      <Tabs textColor="inherit" indicatorColor="secondary" value={tab} onChange={handleChange} sx={{ flexGrow: 1 }} aria-label="menu tabs">
        <Tab label="Users" />
        <Tab label="Groups" />
      </Tabs>
      <Link href={consoleUrl} target="_blank" rel="noopener" underline="none">
        <Typography variant="h6" noWrap >
          <Button sx={{
            backgroundColor: '#fff', '&:hover': {
              backgroundColor: '#fff176',
            },
          }}>Console<OpenInNewIcon fontSize='inherit' /></Button>
        </Typography>
      </Link>
      <Typography variant="h6" noWrap >
        <Button onClick={signOut} sx={{ color: '#fff' }}>Sign out</Button>
      </Typography>
    </Toolbar>
  </AppBar>
);