package com.github.poad.test.deviceflowexample.api

import com.google.gson.annotations.SerializedName

data class OAuthAccessToken(
    @SerializedName("access_token")
    val accessToken: String,
    @SerializedName("expires_in")
    val expiresIn: Long,
    @SerializedName("token_type")
    val tokenType: String
)
