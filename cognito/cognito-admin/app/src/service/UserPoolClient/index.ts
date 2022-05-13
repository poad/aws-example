import { ICredentials } from '@aws-amplify/core';
import {
  AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminDeleteUserCommand, AdminDisableUserCommand, AdminEnableUserCommand,
  AdminListGroupsForUserCommand, AdminRemoveUserFromGroupCommand, AdminResetUserPasswordCommand,
  CognitoIdentityProviderClient, CreateGroupCommand, DeleteGroupCommand, GroupType, ListGroupsCommand, ListUsersCommand,
  ListUsersInGroupCommand, UpdateGroupCommand, UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { User, Group } from '../../interfaces';

interface CreateUserParam {
  username: string,
  email: string,
}

interface CreateGroupParam {
  groupName: string,
  description?: string,
  precedence?: number,
  roleArn?: string,
}

interface AddUserToGroupParam {
  groupName: string,
  username: string,
}

interface RemoveUserFromGroupParam {
  groupName: string,
  username: string,
}

class UserPoolClient {
  private client: CognitoIdentityProviderClient;

  private userPoolId: string;

  constructor(credentials: ICredentials, userPoolId: string, region: string) {
    if (!credentials.authenticated) {
      // eslint-disable-next-line no-console
      console.error('unauthenticated');
      throw Error('unauthenticated');
    }
    this.client = new CognitoIdentityProviderClient({
      region,
      credentials,
    });
    this.userPoolId = userPoolId;
  }

  private static userConversion(users: UserType[], group: string | undefined = undefined): User[] {
    return users.map((user) => {
      const attributes = user.Attributes?.filter(
        (attribute) => attribute.Name !== undefined && attribute.Value !== undefined,
      ).map((attribute) => {
        const entity: { [key: string]: string | undefined; } = {};
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        entity[attribute.Name!] = attribute.Value;
        return entity;
      }).reduce((cur, acc) => ({ ...acc, ...cur })) || {};

      return ({
        email: attributes.email,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        username: user.Username!,
        attributes,
        createdAt: user.UserCreateDate,
        lastModifiedAt: user.UserLastModifiedDate,
        enabled: `${user.Enabled !== undefined ? user.Enabled : true}`,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        status: user.UserStatus!,
        mfa: user.MFAOptions !== undefined ? user.MFAOptions.map((mfaOption) => ({
          deliveryMedium: mfaOption.DeliveryMedium,
          ttributeName: mfaOption.AttributeName,
        })) : [],
        group,
        groups: undefined,
      } as User);
    });
  }

  async createGroup(params: CreateGroupParam): Promise<Group> {
    const resp = await this.client.send(new CreateGroupCommand({
      UserPoolId: this.userPoolId,
      GroupName: params.groupName,
      Description: params.description,
      Precedence: params.precedence,
      RoleArn: params.roleArn,
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newGroup = resp.Group!;
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      groupName: newGroup.GroupName!,
      description: newGroup.Description,
      precedence: newGroup.Precedence,
      roleArn: newGroup.RoleArn,
      creationDate: newGroup.CreationDate,
      lastModifiedDate: newGroup.LastModifiedDate,
    };
  }

  async updateGroup(group: Group): Promise<Group> {
    const resp = await this.client.send(new UpdateGroupCommand({
      UserPoolId: this.userPoolId,
      GroupName: group.groupName,
      Description: group.description,
      Precedence: group.precedence,
      RoleArn: group.roleArn,
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newGroup = resp.Group!;
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      groupName: newGroup.GroupName!,
      description: newGroup.Description,
      precedence: newGroup.Precedence,
      roleArn: newGroup.RoleArn,
      creationDate: newGroup.CreationDate,
      lastModifiedDate: newGroup.LastModifiedDate,
    };
  }

  async deleteGroup(groupName: string): Promise<void> {
    Promise.resolve(await this.client.send(new DeleteGroupCommand({
      UserPoolId: this.userPoolId,
      GroupName: groupName,
    })));
  }

  async createUser(params: CreateUserParam): Promise<User> {
    const resp = await this.client.send(new AdminCreateUserCommand({
      UserPoolId: this.userPoolId,
      Username: params.username,
      ForceAliasCreation: true,
      UserAttributes: [{
        Name: 'email',
        Value: params.email,
      }],
    }));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return UserPoolClient.userConversion([resp.User!])[0];
  }

  async deleteUser(username: string): Promise<void> {
    await this.client.send(new AdminDeleteUserCommand({
      UserPoolId: this.userPoolId,
      Username: username,
    }));
  }

  async enableUser(username: string): Promise<void> {
    await this.client.send(new AdminEnableUserCommand({
      UserPoolId: this.userPoolId,
      Username: username,
    }));
  }

  async disableUser(username: string): Promise<void> {
    await this.client.send(new AdminDisableUserCommand({
      UserPoolId: this.userPoolId,
      Username: username,
    }));
  }

  async resetUserPassword(username: string): Promise<void> {
    await this.client.send(new AdminResetUserPasswordCommand({
      UserPoolId: this.userPoolId,
      Username: username,
    }));
  }

  async addUserToGroup(params: AddUserToGroupParam): Promise<void> {
    await this.client.send(new AdminAddUserToGroupCommand({
      GroupName: params.groupName,
      Username: params.username,
      UserPoolId: this.userPoolId,
    }));
  }

  async removeUserFromGroup(params: RemoveUserFromGroupParam): Promise<void> {
    await this.client.send(new AdminRemoveUserFromGroupCommand({
      GroupName: params.groupName,
      Username: params.username,
      UserPoolId: this.userPoolId,
    }));
  }

  async listGroups(): Promise<Group[]> {
    const handler = async (nextToken?: string): Promise<GroupType[]> => {
      const { NextToken, Groups } = await this.client.send(new ListGroupsCommand({
        UserPoolId: this.userPoolId,
        Limit: 60,
        NextToken: nextToken,
      }));
      const groups = Groups ? Groups : [];
      if (NextToken) {
        return groups.concat(await handler(NextToken));
      }
      return groups;
    };
    const groups = await handler();
    return groups
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .filter((group) => group.GroupName !== undefined)
      .map((group) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        groupName: group.GroupName!,
        description: group.Description,
        precedence: group.Precedence,
        creationDate: group.CreationDate,
        lastModifiedDate: group.LastModifiedDate,
        roleArn: group.RoleArn,
      } as Group));
  }

  async listUsersInGroup(groupNName: string): Promise<User[]> {
    const handler = async (nextToken?: string): Promise<UserType[]> => {
      const { NextToken, Users } = await this.client.send(new ListUsersInGroupCommand({
        GroupName: groupNName,
        UserPoolId: this.userPoolId,
        Limit: 60,
        NextToken: nextToken,
      }));
      const groups = Users ? Users : [];
      if (NextToken) {
        return groups.concat(await handler(NextToken));
      }
      return groups;
    };
    const users = await handler();

    return UserPoolClient.userConversion(users, groupNName);
  }

  async listGroupsForUser(username: string): Promise<string[]> {
    const handler = async (nextToken?: string): Promise<GroupType[]> => {
      const { NextToken, Groups } = await this.client.send(new AdminListGroupsForUserCommand({
        Username: username,
        UserPoolId: this.userPoolId,
        Limit: 60,
        NextToken: nextToken,
      }));
      const groups = Groups ? Groups : [];
      if (NextToken) {
        return groups.concat(await handler(NextToken));
      }
      return groups;
    };
    const groups = await handler();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return groups.map((group) => group.GroupName!);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  }

  async listUsers(): Promise<User[]> {
    const handler = async (paginationToken?: string): Promise<UserType[]> => {
      const { PaginationToken, Users } = await this.client.send(new ListUsersCommand({
        UserPoolId: this.userPoolId,
        PaginationToken: paginationToken,
      }));
      const groups = Users ? Users : [];
      if (PaginationToken) {
        return groups.concat(await handler(PaginationToken));
      }
      return groups;
    };
    const users = await handler();
    return UserPoolClient.userConversion(users);
  }
}

export default UserPoolClient;
