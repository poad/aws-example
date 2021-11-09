package com.github.poad.test.deviceflowexample

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.Observer
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.github.poad.test.deviceflowexample.api.UserInfoApiClient
import com.github.poad.test.deviceflowexample.api.Client
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch


class UserInfoViewModel : ViewModel() {
    internal val userInfo: MutableLiveData<String> by lazy {
        MutableLiveData<String>()
    }
}

class AuthenticatedActivity : AppCompatActivity() {
    private val userIndoModel by lazy {
        ViewModelProvider(this).get(UserInfoViewModel::class.java)
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_authenticated)

        val config = OAuthConfig.load(resources)

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
        val client = Client(config.apiEndpoint, UserInfoApiClient::class.java, accessToken)
            .createService()
        val apiPath = config.userInfoApi
        val userInfoObserver = Observer<String> { userInfo ->
            val userInfoTextView = findViewById<TextView>(R.id.userInfo)
            userInfoTextView.text = userInfo
            userInfoTextView.visibility = View.VISIBLE
        }
        userIndoModel.userInfo.observe(this, userInfoObserver)

        CoroutineScope(Dispatchers.Main + SupervisorJob()).launch {
            try {
                val userInfo = client.userInfo(apiPath)
                val name = userInfo.username ?: userInfo.name
                userIndoModel.userInfo.postValue(name)
            } catch (e: Exception) {
                Log.e("[ERROR]", e.toString())
            }
        }
    }

}
