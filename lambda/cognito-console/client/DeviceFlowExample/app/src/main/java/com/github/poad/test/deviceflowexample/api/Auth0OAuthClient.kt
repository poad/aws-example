package com.github.poad.test.deviceflowexample.api

import androidx.annotation.CheckResult
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.POST

interface Auth0OAuthClient: ApiClient {
    @FormUrlEncoded
    @POST("oauth/device/code")
    @CheckResult
    suspend fun oauthDeviceCode(
        @Field("client_id") clientId: String,
        @Field("scope") scope: String,
        @Field("audience") audience: String
    ): OAuthDeviceCode

    @FormUrlEncoded
    @POST("oauth/token")
    @CheckResult
    suspend fun token(
        @Field("client_id")clientId: String,
        @Field("device_code")deviceCode: String,
        @Field("grant_type")grantType: String = "urn:ietf:params:oauth:grant-type:device_code"): OAuthAccessToken
}
