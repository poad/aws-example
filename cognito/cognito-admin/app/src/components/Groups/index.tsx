import {
  Box, Container,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import IamClient from '../../service/IamClient';
import UserPoolClient from '../../service/UserPoolClient';
import { ErrorDialogProps, Group } from '../../interfaces';
import GroupDetail from '../GroupDetail';
import CreateGroupDialog from '../CreateGroupDialog';
import { Page } from '../../hooks/usePagenationTable';
import { usePagenationGroups } from '../../hooks/usePagenationGroups';
import { useGroup } from '../../hooks/useGroup';
import LoadingSpinner from '../styled/LoadingSpinner';
import ErrorDialog from '../ErrorDialog';
import GroupsTable from './GroupsTable';

interface GroupsProps {
  /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
  container?: Element,
  client: UserPoolClient,
  iamClient: IamClient,
  page: Page,
}

const Groups = ({ client, iamClient, page: initPage }: GroupsProps): JSX.Element => {
  const {
    groups,
    error,
    loaded,
    create: onCreate,
    update,
    delete: onDelete,
    clearError,
  } = usePagenationGroups(client);

  const { group, loadGroup } = useGroup(client);

  const [openGroup, setOpenGroup] = useState<boolean>(false);

  const [errorDialog, setErrorDialog] = useState<ErrorDialogProps>({ open: false });

  useEffect(() => {
    if (error) {
      setErrorDialog({ open: true, message: error.name !== undefined ? error.name : JSON.stringify(error) });
    }
  }, [error]);

  const backdropClose = () => {
    clearError();
    setErrorDialog({ open: false });
  };

  const onOpenGroup = (origin: Group) => {
    loadGroup(origin);
    setOpenGroup(true);
  };

  const handleCloseGroup = () => setOpenGroup(false);

  const handleDelete = (target: Group) => {
    onDelete(target);
    setOpenGroup(false);

  };

  const onUpdate = (iamGroup: Group) => {
    if (!groups) {
      throw Error('Group not found');
    }
    const index = groups.findIndex((item) => group?.groupName === item.groupName);
    if (index === -1) {
      throw Error('Group not found');
    }
    groups[index] = iamGroup;
    loadGroup(iamGroup);
    update(groups);
  };

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const onError = (err: any) => {
    setErrorDialog({ open: true, message: err.name !== undefined ? err.name : JSON.stringify(err) });
  };

  return (
    <React.Fragment>
      <LoadingSpinner expose={!loaded && !errorDialog.open} />
      <ErrorDialog id="alert-dialog" open={errorDialog.open} message={JSON.stringify(errorDialog.message)} onClose={backdropClose} />

      {
        group !== undefined
          ? (<GroupDetail client={client} iamClient={iamClient} group={group} open={openGroup} onClose={handleCloseGroup} onUpdate={onUpdate} onDelete={handleDelete} />)
          : ('')
      }

      <Box component="span" m={1}>
        <Container fixed>
          <CreateGroupDialog client={client} iamClient={iamClient} onCreate={onCreate} onError={onError} />
          {
            groups ? (<GroupsTable groups={groups} page={initPage} onOpenGroup={onOpenGroup} />) : (<></>)
          }
        </Container>
      </Box>

    </React.Fragment>
  );
};

export default Groups;