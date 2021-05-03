package com.github.poad.test.deviceflowexample.api

import androidx.annotation.CheckResult
import retrofit2.http.Headers
import retrofit2.http.POST

interface AwsApiClient: ApiClient {
    @Headers(value = ["Accept: application/json",
        "Content-type:application/json"])
    @POST("userInfo")
    @CheckResult
    suspend fun userInfo(): UserInfo

    @Headers(value = ["Accept: application/json",
        "Content-type:application/json"])
    @POST("signout")
    @CheckResult
    suspend fun signOut(): Unit
}

