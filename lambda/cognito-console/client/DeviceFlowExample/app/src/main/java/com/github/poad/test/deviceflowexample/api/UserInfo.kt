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
    val mfaOptions: List<MFAOption>?,
    @SerializedName("PreferredMfaSetting")
    val preferredMfaSetting: String?,
    @SerializedName("UserAttributes")
    val userAttributes: List<UserAttribute>?,
    @SerializedName("UserMFASettingList")
    val userMFASettingList: List<String>?,
    @SerializedName("username")
    val username: String?,

    @SerializedName("sub")
    val sub: String?,
    @SerializedName("picture")
    val picture: String?,
    @SerializedName("given_name")
    val givenName: String?,
    @SerializedName("family_name")
    val familyName: String?,
    @SerializedName("name")
    val name: String?,
)
