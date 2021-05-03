package com.github.poad.test.deviceflowexample.api

import com.google.gson.GsonBuilder
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit


class Client<T>(private val baseUrl: String, private  val service: Class<T>, private val accessToken: String = "") {
    //繋ぎこみ
    fun createService(): T {
        val client = httpBuilder.build()
        val gson = GsonBuilder()
            .serializeNulls()
            .create()
        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)//基本のurl設定
            .addConverterFactory(GsonConverterFactory.create(gson))
            .client(client)//カスタマイズしたokhttpのクライアントの設定
            .build()
        //Interfaceから実装を取得
        return retrofit.create(service)
    }

    //Clientを作成
    private val httpBuilder: OkHttpClient.Builder
        get() {
            //httpClinetのBuilderを作る
            val httpClient = OkHttpClient.Builder()
            //create http client　headerの追加
            httpClient.addInterceptor(Interceptor { chain ->
                val original = chain.request()
                val request = when (accessToken.isNotBlank()) {
                    true -> original.newBuilder()
                        .header("Accept", "application/json")
                        .header("Authorization", "Bearer " + this.accessToken)
                        .method(original.method(), original.body())
                        .build()
                    else -> original.newBuilder()
                        .header("Accept", "application/json")
                        .method(original.method(), original.body())
                        .build()
                }
                return@Interceptor chain.proceed(request)
            })
                .readTimeout(30, TimeUnit.SECONDS)

            // log interceptor
            val loggingInterceptor = HttpLoggingInterceptor()
            loggingInterceptor.level = HttpLoggingInterceptor.Level.BODY
            httpClient.addInterceptor(loggingInterceptor)

            return httpClient
        }
}
