> Signup now uses email OTP through Resend. See [EMAIL_OTP_SIGNUP.md](EMAIL_OTP_SIGNUP.md) for the current contract.

# Signup OTP using MSG91 authkey

Configuration: MSG91_AUTH_KEY in .env. MSG91_TEMP_ID is ignored and template_id is
not sent. The existing direct SendOTP endpoint is used without a template override.
Widget ID/token are not used.

POST /auth/send-signup-otp
Content-Type: application/json
{ "phoneNumber": "+919876543210" }

POST /auth/verify-signup-otp
Content-Type: application/json
{ "phoneNumber": "+919876543210", "otp": "123456" }

MSG91 stores/verifies the code. No local OTP generation, fixed-code bypass, or raw
code storage is used for signup. A new code can be requested using the send endpoint
after 30 seconds, with 3 sends and 5 verify attempts per 15-minute request window.
OTP lifetime is 5 minutes. Verification allows the existing complete-signup flow
for 10 minutes. Login and password reset retain their existing behavior.

The server calls POST https://control.msg91.com/api/v5/otp with mobile and otp_expiry,
then GET https://control.msg91.com/api/v5/otp/verify with mobile/otp; both use the
server-only authkey header. This direct OTP flow does not return a widget JWT and
therefore does not call verifyAccessToken. Never put the authkey in frontend code.

Tests mock MSG91. Actual delivery without template_id depends on MSG91 account/API support; this
change does not establish that the Widget default template applies to this API. AuthenticationFailure cannot be resolved merely by using a library.
Official example: https://msg91.com/help/hello-contact-center/chatbots-in-hello/msg91-bot/utility/script-use-cases
