package com.github.poad.test.deviceflowexample.api

import androidx.annotation.CheckResult
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Url

interface UserInfoApiClient: ApiClient {
    @Headers(value = ["Accept: application/json",
        "Content-type:application/json"])
    @POST
    @CheckResult
    suspend fun userInfo(@Url url: String): UserInfo
}

