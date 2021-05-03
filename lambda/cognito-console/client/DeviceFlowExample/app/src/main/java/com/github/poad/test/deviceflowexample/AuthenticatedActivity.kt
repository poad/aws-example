package com.github.poad.test.deviceflowexample

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.TextView
import com.github.poad.test.deviceflowexample.api.AwsApiClient
import com.github.poad.test.deviceflowexample.api.Client
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.*

class AuthenticatedActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_authenticated)

        val oauthProps = Properties()
        oauthProps.load(resources.openRawResource((R.raw.oauth)))

        val accessToken = this.intent.getStringExtra(R.string.extra_key_access_token.toString())
        if (accessToken == null) {
            startActivity(
                Intent(
                    applicationContext,
                    MainActivity::class.java
                )
            )
            return
        }
        val client = Client(oauthProps.getProperty("api_endpoint"), AwsApiClient::class.java, accessToken)
            .createService()

        val userInfoTextView = findViewById<TextView>(R.id.userInfo)

        CoroutineScope(Dispatchers.Main + SupervisorJob()).launch {
            try {
                val userInfo = client.userInfo()
                userInfoTextView.text = userInfo.username
            } catch (e: Exception) {
                Log.e("[ERROR]", e.toString())
            }
        }
    }
}