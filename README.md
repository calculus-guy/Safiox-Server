# Safiox Server

Backend API for **Safiox** — a mobile SOS safety application with real-time alerts, emergency contacts, community responders, incident reporting, and an organization dashboard.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Real-time:** Socket.IO
- **Auth:** JWT (access + refresh tokens), Google SSO
- **Media:** Cloudinary
- **Email:** Nodemailer (Brevo SMTP)
- **Push:** Expo Push Notifications

## Quick Start

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Seed the admin user
npm run seed

# Create database indexes
npm run create-indexes

# Start development server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Server port (default: 5000) |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Access token secret |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `CLOUDINARY_*` | Optional | Cloudinary credentials |
| `EMAIL_HOST/PORT/USER/PASS` | Optional | SMTP config |
| `GOOGLE_CLIENT_ID` | Optional | Google SSO |

## API Routes

| Prefix | Module | Auth |
|---|---|---|
| `/api/auth` | Registration, Login, Google SSO, Password reset | Public |
| `/api/users` | Profile, Settings, Device tokens | 🔒 |
| `/api/sos` | Trigger, Escalate, Cancel, Resolve, Track | 🔒 / Public (tracking) |
| `/api/emergency-contacts` | CRUD | 🔒 |
| `/api/organizations` | Nearby orgs, Details | Public |
| `/api/org` | Dashboard: incidents, staff, units, broadcast | 🔒 Org |
| `/api/community-responders` | Register, Alerts, Chat, History | 🔒 |
| `/api/feed` | Posts, Comments, Likes, Follows | 🔒 |
| `/api/notifications` | List, Read, Unread count | 🔒 |
| `/api/messages` | Conversations, DMs | 🔒 |
| `/api/devices` | CCTV/IoT CRUD | 🔒 |
| `/api/incidents` | Report, My incidents | 🔒 |
| `/api/admin` | Users, Orgs, Moderation, Analytics | 🔒 Admin |
| `/api/upload` | Cloudinary signature | 🔒 |

## WebSocket Events

Connect with JWT token:
```js
import io from 'socket.io-client';
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});
```

| Namespace | Events |
|---|---|
| SOS | `sos:join-tracking`, `sos:location-update`, `sos:battery-update` |
| Community | `community:join`, `community:send-message`, `community:typing` |
| Chat | `chat:send-message`, `chat:typing`, `chat:mark-read` |
| Org | `org:join`, `org:unit-location`, `org:staff-status` |

## Project Structure

```
src/
├── config/          # DB, Cloudinary, Email, Socket, Env
├── controllers/     # Route handlers
├── middleware/       # Auth, Validation, Upload, RateLimiter, Error
├── models/          # Mongoose schemas (16 models)
├── routes/          # Express routers
├── scripts/         # Seed, Indexes
├── services/        # Business logic (Auth, Email, SOS, Push)
├── sockets/         # WebSocket event handlers
├── utils/           # ApiError, ApiResponse, asyncHandler, tokens
└── validators/      # Joi schemas
```
## License

ISC


cd safiox-server
npm install
cp .env.example .env   # fill in your MongoDB URI, JWT secrets, etc.
npm run seed            # create admin user
npm run create-indexes  # create DB indexes
npm run dev             # start server on port 5000
