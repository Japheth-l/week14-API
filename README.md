# Blog API

A RESTful API for creating, reading, updating, deleting, and searching blog articles, with full JWT authentication and per-user ownership. Built with Express and MongoDB/Mongoose, structured as clean MVC.

## Project structure

```
blog-api/
├── .env.example          committable — shows required vars, no real secrets
├── .gitignore             ignores .env and node_modules only
├── package.json
├── server.js              entry point: checkEnv → connectDB → app.listen
└── src/
    ├── app.js             Express setup: middleware, route mounting, error handler
    ├── config/
    │   ├── db.js          Mongoose connection (IPv4-forced, SRV fallback notes)
    │   └── checkEnv.js    fails fast at boot if required env vars are missing
    ├── controllers/
    │   ├── auth.controller.js
    │   └── article.controller.js
    ├── middleware/
    │   ├── logger.js
    │   ├── errorHandler.js
    │   ├── requireAuth.js
    │   └── requireOwnership.js
    ├── models/
    │   ├── user.model.js
    │   └── article.model.js
    ├── routes/
    │   ├── auth.routes.js
    │   └── article.routes.js
    └── validators/
        ├── authValidator.js
        └── articleValidator.js
```

`server.js` only starts the process. All Express configuration — middleware, routers, error handling — lives in `src/app.js` and is exported as a plain function, so it can be imported and tested (e.g. with supertest) without ever calling `.listen()`.

## Startup validation

`src/config/checkEnv.js` runs before anything else in `server.js`. It checks that `PORT`, `MONGO_URI`, and `JWT_SECRET` are all set and non-empty; if any are missing, it prints exactly which ones and exits with code `1` — instead of the app crashing later with a cryptic error like `The "uri" parameter... got "undefined"`.

## Schema

Deliberately different shape from the lecture's `article` (title/content/author) so it reads like a real blog post rather than a bare note:

| Field           | Type     | Rules                                              |
|-----------------|----------|-----------------------------------------------------|
| `headline`      | String   | required, 5–120 chars                               |
| `body`          | String   | required, min 30 chars                              |
| `summary`       | String   | optional, max 200 chars — auto-generated from `body` if omitted |
| `author`        | String   | optional, default `"Anonymous"`                     |
| `category`      | String   | one of `tech, lifestyle, business, tutorial, opinion, news`, default `tech` |
| `tags`          | [String] | optional array                                      |
| `status`        | String   | `draft` or `published`, default `draft`             |
| `coverImageUrl` | String   | optional, must be a valid URL                        |
| `readTimeMinutes` | Number (virtual) | computed from `body` word count, not stored |
| `createdAt` / `updatedAt` | Date | automatic via `timestamps: true`         |

A compound text index on `headline`, `body`, and `tags` backs the search route.

## Authentication

| Method | Route               | Description                              |
|--------|---------------------|-------------------------------------------|
| POST   | `/api/auth/signup`  | Create a user (name, email, password — password hashed with bcryptjs) |
| POST   | `/api/auth/login`   | Verify credentials, returns `{ user, token }` (JWT, 7-day expiry) |

- Passwords are hashed with `bcryptjs` (pure-JS, no native build step — no Windows compile issues) before saving. Plaintext passwords are never stored.
- `login` intentionally returns the same `"Invalid credentials"` message whether the email doesn't exist or the password is wrong — never confirm which one failed.
- The JWT payload only carries `userId` and `name` — never the password or anything sensitive, since header+payload are just base64 and readable by anyone with the token.
- Send the token on every subsequent request as `Authorization: Bearer <token>`.

## Routes (all require `Authorization: Bearer <token>`)

| Method | Route                        | Description                          | Ownership check |
|--------|------------------------------|---------------------------------------|:---:|
| POST   | `/api/articles`               | Create an article (full Joi validation) | — |
| GET    | `/api/articles?page=&limit=`  | List articles, newest first, paginated, author populated | — |
| GET    | `/api/articles/search?q=`     | Full-text search across headline/body/tags | — |
| GET    | `/api/articles/:id`           | Get one article                       | — |
| PUT    | `/api/articles/:id`           | Update an article (partial Joi validation, ≥1 field) | ✅ |
| DELETE | `/api/articles/:id`           | Delete an article                     | ✅ |
| PUT    | `/api/articles/:id/cover-image` | Upload an image (form-data field `image`), sets `coverImageUrl` | ✅ |

`/search` is registered before `/:id` in the router so Express doesn't swallow it as an id.

**How ownership works:** `createArticle` sets `userId` from the logged-in user (`req.user`, attached by `requireAuth`) — never from the request body, so nobody can create an article on someone else's behalf. `requireOwnership(Article)` runs before `updateArticleById`/`deleteArticleById`/`uploadCoverImage`; it loads the article, compares its `userId` to `req.user._id`, and returns `403 Forbidden` if they don't match — so only the article's creator can edit, delete, or set its cover image.

## Image upload (Cloudinary)

**Setup:**
1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier is generous).
2. Console → Settings → API Keys → copy your **Cloud name**, **API key**, **API secret**.
3. Add them to `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
4. Install with `npm install --legacy-peer-deps` — `multer-storage-cloudinary`'s peer dependency on Multer doesn't match the latest Cloudinary SDK cleanly, so the flag is required or the install will fail.

**How it works:**
- `src/config/cloudinary.js` configures the Cloudinary SDK from env vars.
- `src/middleware/upload.js` wraps Multer with `CloudinaryStorage` — files stream straight to Cloudinary (folder `blog-api-covers`), never touching local disk. Only `image/*` mimetypes are accepted; max 5MB.
- Route order matters: `requireOwnership(Article)` runs **before** `upload.single('image')`, so a non-owner's file is rejected with `403` before it's ever uploaded to Cloudinary — no wasted bandwidth or storage.
- On success, `req.file.path` is the hosted Cloudinary URL — the controller saves that straight into `article.coverImageUrl`.
- Bad uploads (wrong file type, over 5MB) are caught in `errorHandler.js` and returned as `400` with a clear message instead of a `500`.

**Postman:** for this one request, switch the body type to `form-data` (not raw JSON), add a key named exactly `image`, set its type to `File`, and pick an image from your computer.

## Setup

```bash
npm install
cp .env.example .env
# fill in MONGO_URI and PORT in .env
npm run dev
```

If Atlas fails to connect with `querySrv ECONNREFUSED`, swap the SRV connection string in `.env` for the non-SRV one (Atlas → Connect → Drivers → toggle off "srv") — `config/db.js` already forces IPv4 (`family: 4`), which is usually the actual fix on affected networks. Use an alphanumeric-only Atlas password to rule out auth failures from special characters.

## Postman test plan

1. `POST /api/auth/signup` — valid name/email/password → `201`
2. `POST /api/auth/signup` — same email again → `400` "User already exists"
3. `POST /api/auth/login` — correct credentials → `200`, capture the `token`
4. `POST /api/auth/login` — wrong password → `401` "Invalid credentials"
5. `POST /api/articles` — no `Authorization` header → `401` "No token provided"
6. `POST /api/articles` — valid body + `Authorization: Bearer <token>` → `201`, `userId` set automatically
7. `POST /api/articles` — missing `headline` → `400` with Joi message
8. Sign up a **second** user, log in, capture a second token
9. `PUT /api/articles/:id` (article from step 6) using the **second** user's token → `403` Forbidden
10. `PUT /api/articles/:id` using the **original** user's token → `200`, update succeeds
11. `GET /api/articles?page=1&limit=1` — confirm pagination metadata and populated author
12. `GET /api/articles/search?q=<word from body>` — returns matching article(s)
13. `DELETE /api/articles/:id` with the owner's token → `200`, then repeat `GET` → `404`

## Deploy

### 1. Push to GitHub
- `.env` stays out of the repo — already in `.gitignore`.
- `.env.example` is committed on purpose (no real secrets) so anyone cloning knows what to set.
- Use conventional commit prefixes going forward — `fix: correct ownership check on delete route`, `feat: add cover image upload` — it's a small thing that reads as senior-level to anyone reviewing your history.

### 2. Create the Render Web Service
1. [render.com](https://render.com) → **New +** → **Web Service** → connect the `blog-api-auth` GitHub repo.
2. **Region**: pick the one closest to you — for Ghana, **Frankfurt** is the best available option.
3. **Build Command**: `npm install` (or `npm run build`, now that the script exists)
4. **Start Command**: `npm start` — confirm this matches your actual entry point (`server.js`)
5. **Instance Type**: Free is fine for a portfolio project.

### 3. Environment variables
In the Render dashboard, under **Environment**, add every key from `.env.example` with your real values:

| Key | Value |
|---|---|
| `PORT` | leave blank — Render sets this itself |
| `MONGO_URI` | your **Atlas** connection string, not a local/Docker one — Render can't reach your machine |
| `JWT_SECRET` | the long random string from your local `.env` |
| `CLOUDINARY_CLOUD_NAME` | from your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from your Cloudinary dashboard |

Render also has an "Add from .env" paste option — you can paste your local `.env` contents directly and it'll populate all the rows at once (just delete/skip the `PORT` line since Render manages that itself).

### 4. Post-deploy checklist
Before submitting, verify all four of these against the **live** Render URL (not localhost):
- [ ] **URL check** — hitting the base URL doesn't 502
- [ ] **Data check** — `POST /api/auth/signup` actually creates a user in Atlas
- [ ] **Auth check** — `POST /api/auth/login` returns a real JWT
- [ ] **Persistence check** — create an article, wait for Render to spin down (free tier sleeps after ~15 min idle), hit it again — the article should still be there since data lives in Atlas, not on Render's disk

Cold start note: on the free tier, the first request after 15 minutes of inactivity can take up to a minute while Render wakes the service back up — that's expected, not a bug.

### 5. Submit
- GitHub repo link (clean commit history, README with API docs — this one)
- Render URL (the live HTTPS one, not `localhost`)
- A Postman screenshot showing a successful request against the **live** URL

#   w e e k 1 4 - A P I  
 