package com.github.poad.test.deviceflowexample.api

import com.google.gson.annotations.SerializedName

data class MFAOption(
    @SerializedName("AttributeName")
    val attributeName: String,
    @SerializedName("DeliveryMedium")
    val deliveryMedium: String
)

data class UserAttribute(
    @SerializedName("Name")
    val name: String,
    @SerializedName("Value")
    val value: String
)

data class UserInfo(
    @SerializedName("MFAOptions")
    val mfaOptions: List<MFAOption>,
    @SerializedName("PreferredMfaSetting")
    val preferredMfaSetting: String,
    @SerializedName("UserAttributes")
    val userAttributes: List<UserAttribute>,
    @SerializedName("UserMFASettingList")
    val userMFASettingList: List<String>,
    @SerializedName("Username")
    val username: String,
)
