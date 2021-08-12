/* eslint-disable camelcase */
export interface DeviceCodeTable {
    device_code: string,
    user_code: string,
    expire: number,
    access_token?: string,
    token_type?: string,
}

export interface ErrorResponse {
    error: string,
    error_description?: string,
    error_uri?: string,
}
/* eslint-enable camelcase */
