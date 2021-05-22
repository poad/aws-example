package com.github.poad.test.deviceflowexample.api

import androidx.annotation.CheckResult
import retrofit2.http.*

interface OAuthClient: ApiClient {
    @FormUrlEncoded
    @POST
    @CheckResult
    suspend fun oauthDeviceCode(
        @Url url: String,
        @Field("client_id") clientId: String,
        @Field("scope") scope: String,
        @Field("audience") audience: String?
    ): OAuthDeviceCode

    @FormUrlEncoded
    @POST
    @CheckResult
    suspend fun token(
        @Url url: String,
        @Field("client_id")clientId: String,
        @Field("device_code")deviceCode: String,
        @Field("grant_type")grantType: String = "urn:ietf:params:oauth:grant-type:device_code"): OAuthAccessToken
}
