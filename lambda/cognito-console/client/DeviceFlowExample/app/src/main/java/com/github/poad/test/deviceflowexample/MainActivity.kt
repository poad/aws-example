package com.github.poad.test.deviceflowexample

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View.VISIBLE
import android.widget.ImageView
import android.widget.TextView
import com.github.poad.test.deviceflowexample.api.Auth0Error
import com.github.poad.test.deviceflowexample.api.Client
import com.github.poad.test.deviceflowexample.api.Auth0OAuthClient
import com.google.gson.Gson
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import kotlinx.coroutines.*
import retrofit2.HttpException
import java.time.ZonedDateTime
import java.util.*

/**
 * Loads [MainFragment].
 */
class MainActivity() : Activity() {

    private var poll = true
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val oauthProps = Properties()
        oauthProps.load(resources.openRawResource((R.raw.oauth)))

        val client = Client("https://%s/".format(oauthProps.getProperty("auth0_domain")), Auth0OAuthClient::class.java)
            .createService()

        val userInfoEndpoint = "%s%s".format(oauthProps.getProperty("api_endpoint"), oauthProps.getProperty("user_info_path"))

        deviceFlow(
            client,
            oauthProps.getProperty("oauth_client_id"),
            oauthProps.getProperty("auth0_domain"),
            userInfoEndpoint)
    }

    private fun deviceFlow(clientAuth0: Auth0OAuthClient, clientId: String, auth0Domain: String, audience: String) {
        val imageViewQRCode = findViewById<ImageView>(R.id.imageView)
        val verificationUriTextView = findViewById<TextView>(R.id.verificationUriTextView)
        val userCodeTextView = findViewById<TextView>(R.id.userCodeTextView)

        CoroutineScope(Dispatchers.Main + SupervisorJob()).launch {
            try {
                while (poll) {
                    val deviceCodeResp = clientAuth0
                        .oauthDeviceCode(
                            clientId,
                            "openid read:userInfo",
                            audience
                        )

                    val expiration = ZonedDateTime.now().plusSeconds(deviceCodeResp.expiresIn)

                    val bitmap = BarcodeEncoder().encodeBitmap(
                        deviceCodeResp.verificationUriComplete,
                        BarcodeFormat.QR_CODE,
                        300,
                        300
                    )

                    imageViewQRCode.setImageBitmap(bitmap)
                    imageViewQRCode.visibility = VISIBLE
                    verificationUriTextView.text = deviceCodeResp.verificationUri
                    verificationUriTextView.visibility = VISIBLE
                    userCodeTextView.text = deviceCodeResp.userCode
                    userCodeTextView.visibility = VISIBLE
                    val deviceCode = deviceCodeResp.deviceCode
                    val interval = deviceCodeResp.interval

                    while (true) {
                        if (ZonedDateTime.now() >= expiration) {
                            Log.v("device code", "expire")
                            break
                        }

                        Log.v("device code", "exire at " + expiration.toLocalDate())

                        try {
                            if (Objects.nonNull(deviceCode)) {
                                val response = clientAuth0.token(
                                    clientId,
                                    deviceCode
                                )
                                Log.v("oauth", response.toString())
                                val nextIntent = Intent(
                                    applicationContext,
                                    AuthenticatedActivity::class.java
                                )

                                poll = false
                                nextIntent.putExtra(R.string.extra_key_access_token.toString(), response.accessToken)
                                startActivity(
                                    nextIntent
                                )
                                break
                            }
                        } catch (e: Exception) {
                            when (e) {
                                is HttpException -> {
                                    val response: Auth0Error? = e.response()?.errorBody()?.source()?.let {
                                        Gson().fromJson(it.readUtf8(), Auth0Error::class.java)
                                    }
                                    if (response?.error != "authorization_pending" ) {
                                        Log.e("[ERROR]", response.toString())
                                        break
                                    }
                                }
                                else -> {
                                    Log.e("[ERROR]", e.toString())
                                    break
                                }
                            }
                        }
                        delay(interval.toLong() * 1000L)
                    }
                }
            } catch (e: Exception) {
                Log.d("[ERROR]", e.toString())
            }
        }
    }
}