# Express.js API Project

A Node.js Express API server with basic routing, middleware, and project structure.

## Features

- ✅ Express.js server setup
- ✅ Basic middleware (JSON parsing, URL encoding)
- ✅ Custom logging middleware
- ✅ Rate limiting middleware
- ✅ RESTful API routes for users
- ✅ Error handling
- ✅ Health check endpoint
- ✅ Organized project structure

## Project Structure

```
API/
├── app.js              # Main application file
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variables template
├── routes/
│   └── users.js        # User routes
├── middleware/
│   ├── logger.js       # Request logging middleware
│   └── rateLimiter.js  # Rate limiting middleware
├── controllers/        # Route controllers (empty, ready for use)
├── models/            # Data models (empty, ready for use)
└── config/            # Configuration files (empty, ready for use)
```

## Getting Started

### Prerequisites
- Node.js (v12 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

Or start in production mode:
```bash
npm start
```

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Available Endpoints

#### General
- `GET /` - Welcome message and API info
- `GET /api/health` - Health check with system info

#### Users API
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Example Requests

#### Create a user:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

#### Get all users:
```bash
curl http://localhost:3000/api/users
```

## Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm test` - Run tests (not implemented yet)

## Middleware

### Logger
Logs all incoming requests with timestamp, method, URL, and IP address.

### Rate Limiter
Basic rate limiting implementation:
- Default: 100 requests per 15 minutes per IP
- Returns 429 status when limit exceeded

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Next Steps

This is a basic starter template. You can extend it by:

1. Adding a database (MongoDB, PostgreSQL, etc.)
2. Implementing authentication (JWT, sessions)
3. Adding data validation (Joi, express-validator)
4. Adding testing (Jest, Mocha)
5. Adding more comprehensive error handling
6. Adding API documentation (Swagger/OpenAPI)
7. Adding CORS middleware
8. Adding security headers (helmet)

## License

ISC
