# Quibish Backend Server

Backend API server for the Quibish messaging application.

## Features

- 🔐 JWT-based authentication
- 👥 User management
- 💬 Real-time messaging
- 🛡️ Security middleware (Helmet, CORS, Rate limiting)
- ⚡ Express.js with modern middleware
- 🎯 RESTful API design
- 📊 Health monitoring endpoints

## Quick Start

### Prerequisites

- Node.js 14+ 
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Or start in production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/ping` - Health check endpoint
- `GET /api/health` - Detailed health status
- `GET /api/status` - Server status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `GET /api/users/:id` - Get user by ID
- `GET /api/users` - Get all users (paginated)

### Messages
- `GET /api/messages` - Get messages (paginated)
- `POST /api/messages` - Send new message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/react` - Add/remove reaction

## Demo Users

The server comes with pre-configured demo users:

| Username | Password | Email | Role |
|----------|----------|-------|------|
| demo | demo | demo@quibish.com | user |
| john | password | john@example.com | user |
| jane | password | jane@example.com | user |
| admin | admin | admin@quibish.com | admin |

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## Frontend Integration

The backend is configured to work with the React frontend running on `http://localhost:3000`. The frontend will automatically connect to this backend server.

## Development

- `npm run dev` - Start development server with nodemon (auto-restart)
- `npm start` - Start production server

## Security Features

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configured for frontend origin
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Request validation and sanitization
- **Password Hashing**: bcrypt for secure password storage

## Production Considerations

For production deployment:

1. Change the `JWT_SECRET` environment variable
2. Use a real database instead of in-memory storage
3. Configure proper logging
4. Set up SSL/TLS certificates
5. Configure proper CORS origins
6. Set up database connection pooling
7. Implement proper session management

## Architecture

```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── routes/                # API route handlers
│   ├── auth.js           # Authentication routes
│   ├── users.js          # User management routes
│   ├── messages.js       # Message handling routes
│   └── health.js         # Health check routes
└── README.md             # This file
```

## API Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {...},
  "message": "Optional message",
  "error": "Error message (if success is false)"
}
```
