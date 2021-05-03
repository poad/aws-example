package com.github.poad.test.deviceflowexample.api

import com.google.gson.annotations.SerializedName

data class Auth0Error(
    @SerializedName("error")
    val error: String,
    @SerializedName("error_description")
    val error_description: String,
)
