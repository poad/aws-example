package com.github.poad.test.deviceflowexample

import android.app.Application
import com.amplifyframework.auth.cognito.AWSCognitoAuthPlugin
import com.amplifyframework.core.Amplify
import com.amplifyframework.core.plugin.Plugin

class App() : Application() {
    override fun onCreate() {
        super.onCreate()

        Amplify.addPlugin<Plugin<*>>(AWSCognitoAuthPlugin())

        Amplify.configure(applicationContext)
    }
}
