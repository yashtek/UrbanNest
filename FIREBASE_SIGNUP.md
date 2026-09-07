> Signup now uses email OTP through Resend. See [EMAIL_OTP_SIGNUP.md](EMAIL_OTP_SIGNUP.md) for the current contract.

# Firebase Phone Number Verification (PNV)

This uses Firebase PNV, not Firebase Authentication. No service-account JSON is
needed for verifying PNV tokens: Google publishes the ES256 signing keys.
Set FIREBASE_PROJECT_NUMBER and FIREBASE_PROJECT_ID from Project settings > General.
The backend verifies signature, JWT type, issuer, both project audiences, expiry,
and the phone in the subject claim. Existing OTP endpoints are preserved.

FIREBASE_TOKEN is the console's 7-day TEST SESSION token. It is used by the Android
PNV SDK with enableTestSession, not as a backend authentication key. It cannot
verify arbitrary numbers submitted from Postman. Do not expose it in production.
Test sessions yield a fake phone number, not evidence of real phone ownership.

Android integration (supply test token through your debug configuration):
val fpnv = FirebasePhoneNumberVerification.getInstance()
fpnv.enableTestSession(testToken) // Once, test builds only.
fpnv.getVerifiedPhoneNumber(activity).addOnSuccessListener { result ->
    // Send result.getPhoneNumber() and result.getToken() to your backend.
}
The test device must meet Firebase's GMS beta requirements. Production requires
PNV production setup, compatible carrier/device and user consent.

POST /auth/verify-phone-number
{ "phoneNumber": "<number returned by SDK>", "fpnvToken": "<result.getToken()>" }

POST /auth/complete-signup
{ "phoneNumber": "<number returned by SDK>", "fpnvToken": "<result.getToken()>",
  "fullName": "Test User", "username": "testuser", "password": "StrongPass123!" }

Both endpoints verify the signed PNV token. The signup endpoint checks before
creating an account; the verification endpoint does not create a global phone grant.
Postman can test with the SDK's signed result JWT, not with the console test token.
The default unified Android flow is assumed; custom flows additionally need server
nonce issuance/consumption. No Android project is present in this workspace.

Tests use locally signed ES256 fixtures and mocked Google keys; live Android/PNV
verification still requires project configuration and SDK-generated tokens.
https://firebase.google.com/docs/phone-number-verification/android/get-started
https://firebase.google.com/docs/phone-number-verification/verify-tokens
