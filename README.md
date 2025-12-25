## Parcel Logistics Backend

Express + MongoDB backend that delivers RBAC-enforced courier workflows (ADMIN, AGENT, CUSTOMER), Socket.IO updates, Cloudinary uploads, and Redis-powered rate limiting.

### Highlights
- **MongoDB models** for users, addresses, parcels, parcel status history, tracking points, notifications, agent profiles, refresh tokens, and audit logs (with soft delete flags where needed).
- **RBAC middleware** guards customer bookings, agent workflows, and admin tooling. Ownership checks ensure customers/agents can only access their resources.
- **Auth flows** use bcrypt hashing, JWT access tokens, hashed refresh tokens stored in Mongo, rotation + reuse detection, and locale-aware responses.
- **Customer features**: parcel booking, paginated “my parcels”, parcel detail, history, tracking feed, and QR/barcode retrieval.
- **Agent workflows**: assigned parcel list, valid status transitions, GPS pushes, Google Maps route optimization, tracking streams, QR/barcode scan verification.
- **Admin suite**: parcel search/sort, agent assignment (with audit logs), metrics dashboard, CSV/PDF booking reports, user directory, notification test hook.
- **Platform services**: Socket.IO rooms per parcel/customer/agent, Swagger docs, Cloudinary config, Redis rate limiting, centralized error handling, and locale middleware.

### Tech Stack
Node.js 20, Express 5, MongoDB (Mongoose), Redis (ioredis), Socket.IO 4, Cloudinary, Zod, QRCode, PDFKit, json2csv, Google Maps Directions API.

### Getting Started
1. Install Node.js 20+ and npm 10+.
2. Copy `.env.example` → `.env` and populate Mongo, Redis, JWT secrets, Google Maps key, and Cloudinary credentials.
3. Install dependencies (regenerates `package-lock.json`):
   ```bash
   npm install
   ```
4. Start the API locally:
   ```bash
   npm run dev
   ```
5. Or run everything (Mongo, Redis, API) via Docker:
   ```bash
   docker-compose up --build
   ```
6. Swagger docs live at `http://localhost:5000/api/v1/docs`.

### Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Nodemon-powered development server |
| `npm start` | Production start (uses compiled JS directly) |
| `npm run lint` | Placeholder (wire up ESLint if desired) |
| `npm test` | Placeholder (add Jest/Supertest as needed) |

### Docker Compose
`docker-compose.yml` provisions:
- `mongo` (port 27017) with persistent volume.
- `redis` (port 6379) for rate limiting/caching/token revocation.
- `api` Node container pointing at the above services. Override secrets through env vars.

### Directory Structure
```
controller/     business logic per module (auth, parcels, agent, admin, notifications)
route/          REST route definitions mounted in mainroute/index.js
model/          Mongoose schemas for every core entity
middleware/     auth, RBAC, locale, rate limiting, errors
services/       shared domain services (parcel, agent, admin, reports, notifications)
config/         env validation, Redis + Cloudinary configuration
utils/          helpers (tokens, crypto, pagination, catchAsync, etc.)
sockets/        Socket.IO emitter registration
errors/         AppError + Mongo error mappers
server.js       Express bootstrap + Socket.IO wiring + Mongo connection
```

### Notes
- Run `npm install` after pulling to refresh `node_modules` and regenerate `package-lock.json`.
- Provide a valid `GOOGLE_MAPS_API_KEY` to enable agent route optimization; otherwise the endpoint returns a validation error.
- Redis is required for the rate limiter and can run locally (`docker-compose` handles this automatically).
- Cloudinary credentials are loaded from env; replace the example values before uploading media.
