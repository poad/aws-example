import React from 'react';
import {
  Divider, List, ListItem, ListItemText, ListItemAvatar, Avatar,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { S3ProviderListOutput } from '@aws-amplify/storage';

export interface S3DirectoryProp {
  s3Objects: S3ProviderListOutput
}

const S3Directory = (props: S3DirectoryProp): JSX.Element => (
  <div>
    <List>
      {
        props.s3Objects
          .map((obj) => obj.key)
          .filter((key) => key?.endsWith('index.html'))
          .map((entry: string | undefined): JSX.Element => (
            <a href={`${entry}`} key={entry}>
              <Divider />
              <ListItem>
                <ListItemAvatar>
                  <Avatar>
                    <FolderIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={entry} />
              </ListItem>
            </a>
          ))
      }
    </List>
    <Divider />
  </div>
);

export default S3Directory;
