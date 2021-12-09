import React from 'react';
import {
  Avatar, List, ListItem, ListItemAvatar, ListItemText,
} from '@mui/material';
import AccountBoxIcon from '@mui/icons-material/AccountBox';

export interface HeaderProps {
  username?: string
}

const Header = (props: HeaderProps): JSX.Element => (
  <header>
    <nav>
      <List>
        {
          props.username !== undefined ? (
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <AccountBoxIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={props.username} />
            </ListItem>) : ''
        }
      </List>
    </nav>

    <style jsx>{`
        header {
          padding: 0.2rem;
          color: #fff;
          background-color: #333;
        }
        nav {
          max-width: 42rem;
          margin: 0.5rem auto;
        }
        ul {
          display: flex;
          list-style: none;
          margin-left: 0;
          padding-left: 0;
        }
        li {
          margin-right: 1rem;
        }
        li:nth-child(3) {
          margin-right: auto;
        }
        a {
          color: #fff;
          text-decoration: none;
        }
        button {
          font-size: 1rem;
          color: #fff;
          cursor: pointer;
          border: none;
          background: none;
        }
      `}</style>
  </header>
);

export default Header;
