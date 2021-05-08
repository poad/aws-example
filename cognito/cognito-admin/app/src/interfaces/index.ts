export interface User {
    username?: string,
    attributes?: {
        name: string,
        value?: string
    }[],
    createdAt?: Date,
    lstModifiedAt?: Date,
    enabled?: boolean,
    status?: string,
    mfa?: {
        deliveryMedium?: string,
        attributeName?: string,
    }[],
};
