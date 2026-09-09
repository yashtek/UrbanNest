# Signup email OTP (current flow)

Set RESEND_KEY in .env. Optional RESEND_FROM defaults to
Umanage <noreply@yashtek.in>. Verify yashtek.in in Resend before sending.
On Render, set RESEND_FROM="Umanage <noreply@yashtek.in>" and redeploy;
an existing RESEND_FROM value overrides the default sender.
No API keys or recipient addresses are hardcoded. No actual email was sent in tests.

1. POST /auth/send-signup-otp
   { "email": "person@example.com" }
   Uses the email entered on the signup form. Returns emailId, expiresIn:300,
   resendAfter:30 only after Resend accepts the email. Acceptance is not delivery.
2. POST /auth/verify-signup-otp
   { "email": "person@example.com", "otp": "123456" }
   Returns data.verificationToken and expiresIn:1800 after matching the stored hash.
3. POST /auth/complete-signup
   { "email": "person@example.com", "verificationToken": "<returned token>",
     "phoneNumber": "+919876543210", "fullName": "Test User",
     "username": "testuser", "password": "StrongPass123!" }
   Returns the app session. Firebase/MSG91 tokens are no longer required for signup.

Use Content-Type: application/json. Emails are trimmed/lowercased; six-digit OTP
strings are required. Repeat send after 30 seconds to replace the previous code.
Maximum 3 sends per 15 minutes and 5 verification attempts per code.

MongoDB signup_email_otps stores bcrypt hashes with expiresAt = creation + 5 minutes.
A TTL index automatically removes expired records. MongoDB's background deletion
may lag expiry, but verification rejects an expired code immediately. Successful
verification deletes the code immediately and issues an email-bound single-use
signup proof, also stored only as a hash with a five-minute TTL. A failed signup
consumes its proof; repeat verification to retry. Email verification does not verify
the phone number: new users have emailVerified:true and phoneVerified:false.

Run bun run dev to create indexes during startup. Login remains username/password.
Legacy Firebase verification and password-reset endpoints are not removed, but are
not used by the new email signup flow. Old MSG91/Firebase signup guides are superseded.

Sources:
https://resend.com/docs/api-reference/emails/send-email
https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
https://www.mongodb.com/docs/manual/core/index-ttl/

## Resend and password recovery (email)

All paths below use POST with JSON. Signup resend: `/auth/resend-signup-otp`
with `{ "email": "person@example.com" }` (the send endpoint also resends).
Cooldown: 30 seconds; maximum 3 sends per email per purpose per 15 minutes.
Each OTP expires in 5 minutes.

Password recovery now accepts email instead of phoneNumber:
1. `/auth/forgot-password/send-otp` or `/auth/forgot-password/resend-otp`
   with `{ "email": "person@example.com" }`.
2. `/auth/forgot-password/verify-otp` with
   `{ "email": "person@example.com", "otp": "123456" }`.
   Save `data.verificationToken` (valid for 5 minutes).
3. `/auth/forgot-password/reset` with
   `{ "email": "person@example.com", "verificationToken": "<token>", "password": "NewStrongPass123!" }`.
   Successful reset invalidates existing login tokens. Reset proofs cannot authorize signup.

Complete signup: keep the verified email, verificationToken, and form details on
400 validation or 409 duplicate-field errors. Show the error and let the user edit
and resubmit `/auth/complete-signup` with the same token. Signup verification lasts
30 minutes; rejected database writes restore the token with its original expiry.
A 403 means verification is expired, already used, or invalid and requires verifying
email again. Do not navigate back to signup for every API error.
