export interface User {
  username: string,
  attributes: {
    [key: string]: string | undefined,
  },
  createdAt: Date | undefined,
  lastModifiedAt: Date | undefined,
  enabled: string,
  status: string,
  mfa: {
    deliveryMedium?: string,
    attributeName?: string,
  }[],
  group: string | undefined,
  groups: string[] | undefined,
  email: string | undefined,
}

export interface Group {
  groupName: string,
  description?: string,
  precedence?: number,
  creationDate?: Date,
  lastModifiedDate?: Date,
  users?: User[],
  roleArn?: string,
}

export interface IamRole {
  path: string | undefined,
  roleName: string | undefined,
  roleId: string | undefined,
  arn: string | undefined,
  createDate: Date | undefined,
  assumeRolePolicyDocument?: string,
  description?: string,
  maxSessionDuration?: number,
  permissionsBoundary?: {
    permissionsBoundaryType?: string,
    permissionsBoundaryArn?: string,
  },
  tags?: {
    key: string | undefined,
    value: string | undefined,
  }[],
  roleLastUsed?: {
    lastUsedDate?: Date,
    region?: string
  },
}

export interface Tag {
  key: string | undefined,
  value: string | undefined,
}

export interface ErrorStatus {
  error: boolean,
  message?: string
}

export interface ErrorDialog {
  open: boolean,
  message?: string,
}
