package com.github.poad.test.deviceflowexample

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View.VISIBLE
import android.widget.ImageView
import android.widget.TextView
import androidx.lifecycle.*
import androidx.lifecycle.Observer
import com.github.poad.test.deviceflowexample.api.OAuthError
import com.github.poad.test.deviceflowexample.api.Client
import com.github.poad.test.deviceflowexample.api.OAuthClient
import com.google.gson.Gson
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import kotlinx.coroutines.*
import retrofit2.HttpException
import java.time.ZonedDateTime
import java.util.*
import androidx.appcompat.app.AppCompatActivity

/**
 * Loads [MainFragment].
 */
private data class OAuthApiEndpoints(val deviceCode: String, val token: String) {
}

class VerificationUriViewModel : ViewModel() {
    internal val verificationUri: MutableLiveData<String> by lazy {
        MutableLiveData<String>()
    }
}

class UserCodeViewModel : ViewModel() {
    internal val userCode: MutableLiveData<String> by lazy {
        MutableLiveData<String>()
    }
}

class MessageViewModel : ViewModel() {
    internal val message: MutableLiveData<String?> by lazy {
        MutableLiveData<String?>()
    }
}

class MainActivity() : AppCompatActivity() {

    private var poll = true
    private val verificationUriModel by lazy {
        ViewModelProvider(this).get(VerificationUriViewModel::class.java)
    }
    private val userCodeModel by lazy {
        ViewModelProvider(this).get(UserCodeViewModel::class.java)
    }
    private val messageModel by lazy {
        ViewModelProvider(this).get(MessageViewModel::class.java)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val oauthProps = Properties()
        oauthProps.load(resources.openRawResource((R.raw.oauth)))

        val imageViewQRCode = findViewById<ImageView>(R.id.imageView)
        val verificationUriTextView = findViewById<TextView>(R.id.verificationUriTextView)
        val userCodeTextView = findViewById<TextView>(R.id.userCodeTextView)
        val messageTextView = findViewById<TextView>(R.id.messageTextView)

        // Create the observer which updates the UI.
        val verificationUriObserver = Observer<String> { verificationUri ->
            val bitmap = BarcodeEncoder().encodeBitmap(
                verificationUri,
                BarcodeFormat.QR_CODE,
                300,
                300
            )

            imageViewQRCode.setImageBitmap(bitmap)
            imageViewQRCode.visibility = VISIBLE
            verificationUriTextView.text = verificationUri
            verificationUriTextView.visibility = VISIBLE
        }

        val userCodeObserver = Observer<String> { userCode ->
            userCodeTextView.text = userCode
            userCodeTextView.visibility = VISIBLE
        }

        val messageObserver = Observer<String?> { message ->
            if (message != null) {
                messageTextView.text = message
                messageTextView.visibility = VISIBLE
            }
        }
        verificationUriModel.verificationUri.observe(this, verificationUriObserver)
        userCodeModel.userCode.observe(this, userCodeObserver)
        messageModel.message.observe(this, messageObserver)

        val oauthEndpoint = oauthProps.getProperty("oauth.endpoint")
        val client = Client(oauthEndpoint, OAuthClient::class.java)
            .createService()

        val audience = oauthProps.getProperty("oauth.audience", "")

        val deviceCodePath = oauthProps.getProperty("oauth.device_code_path")
        val tokenPath = oauthProps.getProperty("oauth.token_path")
        val scope = oauthProps.getProperty("oauth.scope")

        deviceFlow(
            client,
            oauthProps.getProperty("oauth.client_id"),
            OAuthApiEndpoints(
                "%s%s".format(oauthEndpoint, deviceCodePath),
                "%s%s".format(oauthEndpoint, tokenPath)
            ),
            scope,
            if (audience.isEmpty()) null else audience
        )
    }

    private fun deviceFlow(
        oauthClient: OAuthClient,
        clientId: String,
        endpoints: OAuthApiEndpoints,
        scope: String,
        audience: String?
    ) {
        CoroutineScope(Dispatchers.Main + SupervisorJob() + Dispatchers.IO).launch {
            try {
                while (poll) {
                    val deviceCodeResp = oauthClient
                        .oauthDeviceCode(
                            endpoints.deviceCode,
                            clientId,
                            scope,
                            audience
                        )

                    val expiration = ZonedDateTime.now().plusSeconds(deviceCodeResp.expiresIn)

                    verificationUriModel.verificationUri.postValue(
                        deviceCodeResp.verificationUriComplete ?: deviceCodeResp.verificationUri)
                    userCodeModel.userCode.postValue(deviceCodeResp.userCode)
                    messageModel.message.postValue(deviceCodeResp.message)

                    val deviceCode = deviceCodeResp.deviceCode
                    val interval = deviceCodeResp.interval ?: "5"


                    while (true) {
                        if (ZonedDateTime.now() >= expiration) {
                            Log.v("device code", "expire")
                            break
                        }

                        Log.v("device code", "exire at " + expiration.toLocalDate())

                        try {
                            if (Objects.nonNull(deviceCode)) {
                                val response = oauthClient.token(
                                    endpoints.token,
                                    clientId,
                                    deviceCode
                                )
                                Log.v("oauth", response.toString())
                                val nextIntent = Intent(
                                    applicationContext,
                                    AuthenticatedActivity::class.java
                                )

                                poll = false
                                nextIntent.putExtra(
                                    R.string.extra_key_access_token.toString(),
                                    response.accessToken
                                )
                                startActivity(
                                    nextIntent
                                )
                                break
                            }
                        } catch (e: Exception) {
                            when (e) {
                                is HttpException -> {
                                    val response: OAuthError? =
                                        e.response()?.errorBody()?.source()?.let {
                                            Gson().fromJson(it.readUtf8(), OAuthError::class.java)
                                        }
                                    if (response?.error != "authorization_pending") {
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
