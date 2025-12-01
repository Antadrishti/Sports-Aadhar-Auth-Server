# Auth Server API

Brief guide to all available endpoints and their payloads.

## Environment
- Set required variables in `.env` (at minimum: `PORT`, `MONGO_DB_URI`, `SECRET`; for SMS: `VONAGE_API_KEY`, `VONAGE_API_SECRET`; for images: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and either `CLOUDINARY_API_SECRET` or `CLOUDINARY_UPLOAD_PRESET`).
- All endpoints expect JSON unless noted.
- Authenticated routes require header `Authorization: Bearer <JWT>`.

## Auth
- `POST /auth/signup` (alias `/auth/register`): Create user. Body: `{ name, email, password, age, city, state, pincode }`. Returns user + JWT.
- `POST /auth/login`: Login with email or phone. Body: `{ identifier, credential }`. Returns user + JWT.
- `POST /auth/add-phone` (auth): Send OTP to phone. Body: `{ phoneNumber }`. Returns message (and OTP/smsStatus in non‑prod).
- `POST /auth/verify-phone` (auth): Verify phone with OTP. Body: `{ phoneNumber, otp }`. Returns verified phone.

## Profile
- `GET /profile` (auth): Current user profile.
- `POST /profile/picture` (auth): Upload/update profile picture. Accepts multipart form-data (`image` file field) or JSON body `{ image: "<data-uri or image URL>" }`. Returns Cloudinary URL/publicId.
- `GET /profile/picture` (auth): Get current user’s picture metadata.
- `GET /profile/picture/:id` (auth): Get another user’s picture metadata.

## Athletes
- `GET /athletes`: Public list of all athletes (password omitted).
- `GET /athletes/:id`: Public lookup by id, returns `{ id, name }`.

## Leaderboard
- `GET /leaderboard`: Public list ranked by averageScore. Returns `{ athleteId, name, averageScore, testsTaken, avatarUrl }`. `averageScore` is the sum of recorded test scores (missing tests treated as 0) divided by 8; sorted high to low, then testsTaken, then name.
  - Scoring: uses scores from `/tests` submissions; if fewer than 8 tests exist, missing slots count as 0. `testsTaken` reflects how many scored tests the athlete has.

## Tests (per-user)
- `POST /tests/upload` (auth):
  - To upsert a single test: Body `{ test: { testNumber, sequenceLabel, nameOfTest, qualityTested?, ageCategory?, ratingScale?, testDate auto-set } }`. Rejects if the testNumber already exists.
  - To replace the full list: Body `{ tests: [ ... ] }` or omit to load defaults (8 predefined tests).
- `POST /tests/upload/:category` (auth): Upserts predefined tests for a category. Allowed: `flexibility` (`flexiblity`), `lowerbodyexplosive`, `upperbodystrength` (`upperbodyexplosive`, `upperbody`), `speed`, `agility`, `corestrength` (`core`), `endurance`. Rejects if the testNumber already exists.
- `GET /tests/user/:id` (auth): Fetch all tests saved for the given user id; returns `{ userId, tests: [...] }` (empty array if none).
- Notes: `ratingScale` is a single number 1–10; duplicate testNumbers return 400; `testDate` auto-populates to now.

## Misc
- Server start: `node server.js` (or `nodemon server.js`).
- All responses are JSON; errors use `{ error: "<message>" }`.
