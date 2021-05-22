package com.github.poad.test.deviceflowexample.api

import com.google.gson.annotations.SerializedName

data class OAuthAccessToken(
    @SerializedName("access_token")
    val accessToken: String,
    @SerializedName("expires_in")
    val expiresIn: Long,
    @SerializedName("token_type")
    val tokenType: String,
    @SerializedName("ext_expires_in")
    val exExpiresIn: Long?,
    @SerializedName("scope")
    val scope: String?,
    @SerializedName("id_token")
    val idToken: String?,
    @SerializedName("refresh_token")
    val refreshToken: String?,
)
