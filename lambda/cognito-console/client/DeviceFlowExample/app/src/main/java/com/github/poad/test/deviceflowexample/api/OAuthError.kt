package com.github.poad.test.deviceflowexample.api

import com.google.gson.annotations.SerializedName

data class OAuthError(
    @SerializedName("error")
    val error: String,
    @SerializedName("error_description")
    val error_description: String,
)
