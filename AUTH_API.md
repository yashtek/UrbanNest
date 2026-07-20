# UrbanNest mobile authentication API

Set `MONGODB_URI` and a random `JWT_ACCESS_SECRET` of at least 32 characters. JWTs expire after seven days.

All phone numbers must use E.164 form, such as `+919876543210`. The bundled development OTP provider logs the six-digit code to the API console; replace `DevelopmentOtpProvider` in `src/otp/otp.service.ts` with Firebase, Twilio, or MSG91 before production.

## Signup

1. `POST /auth/send-signup-otp` — `{ "phoneNumber": "+919876543210" }`
2. `POST /auth/verify-signup-otp` — `{ "phoneNumber": "+919876543210", "otp": "123456" }`
3. `POST /auth/complete-signup` — `{ "phoneNumber": "+919876543210", "fullName":"Asha Patel", "email":"asha@example.com", "username":"asha_p", "password":"StrongPass123!" }`

## Session endpoints

- `POST /auth/login` — `{ "username":"asha_p", "password":"StrongPass123!" }`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/verify-token`
- `GET /auth/check-username?username=asha_p`

Protected endpoints require `Authorization: Bearer <accessToken>`. Logout and password reset increment the account token version, immediately invalidating all existing tokens.

## Password reset

1. `POST /auth/forgot-password/send-otp`
2. `POST /auth/forgot-password/verify-otp`
3. `POST /auth/forgot-password/reset` — `{ "phoneNumber":"+919876543210", "password":"NewStrongPass123!" }`

The first two bodies use the same phone/OTP fields as signup. OTPs expire after five minutes, can be sent at most three times per 15-minute window, allow five verification attempts, and are one-time use.
