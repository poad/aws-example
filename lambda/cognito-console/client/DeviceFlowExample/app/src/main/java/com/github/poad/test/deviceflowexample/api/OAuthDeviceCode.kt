package com.github.poad.test.deviceflowexample.api

import com.google.gson.annotations.SerializedName

data class OAuthDeviceCode(
    @SerializedName("device_code")
    val deviceCode: String,
    @SerializedName("user_code")
    val userCode: String,
    @SerializedName("verification_uri")
    val verificationUri: String,
    @SerializedName("expires_in")
    val expiresIn: Long,
    @SerializedName("interval")
    val interval: String,
    @SerializedName("verification_uri_complete")
    val verificationUriComplete: String
)
