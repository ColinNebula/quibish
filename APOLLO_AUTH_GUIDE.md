# Apollo Client Authentication Guide

This guide explains how to use Apollo Client for authentication in the QuibiChat application.

## Setup Overview

1. **Directory Structure**
   - `src/services/apolloClient.js` - Apollo Client configuration
   - `src/services/authOperations.js` - GraphQL operations for auth
   - `src/context/AuthContext.js` - React Context for auth state
   - `server/graphql.js` - GraphQL server with auth resolvers

2. **Key Components**
   - `AuthProvider` - Manages auth state across the app
   - `Login` component - Handles user login
   - `Register` component - Handles user registration
   - Apollo Client - Configured with auth token middleware

## Authentication Flow

### 1. Login Process
1. User enters credentials on the login form
2. Form calls Apollo `useMutation` hook with LOGIN_USER operation
3. On success:
   - JWT token is stored in localStorage
   - User data is stored in AuthContext
   - User is redirected to the main app

### 2. Token Management
- JWT token is stored in localStorage as 'authToken'
- Token is included in all GraphQL requests via Apollo Link
- When token expires or is invalid, user is logged out

### 3. Auth State Checking
- `AuthContext` provides current auth state to all components
- `useAuth()` hook gives components access to:
  - `isAuthenticated` - Boolean indicating auth state
  - `user` - Current user data
  - `login()` - Function to log in
  - `logout()` - Function to log out

### 4. Protected Routes
The main application content is only shown when user is authenticated:
```jsx
{isAuthenticated && user ? (
  <ProChat user={user} onLogout={handleLogout} />
) : renderAuthComponent()}
```

## Testing Authentication

### Test Accounts
The mock server has two pre-configured user accounts:

1. **John Doe**
   - Email: john.doe@example.com
   - Password: password123

2. **Jane Smith**
   - Email: jane.smith@example.com
   - Password: password123

### Running the Server
1. Navigate to server directory: `cd server`
2. Install dependencies: `npm install`
3. Start the server: `npm start` or `npm run dev`
4. Access GraphQL playground: http://localhost:5000/graphql

## GraphQL Operations

### Login
```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      name
      email
      # other fields...
    }
  }
}
```

### Register
```graphql
mutation Register($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    token
    user {
      id
      name
      email
      # other fields...
    }
  }
}
```

### Current User
```graphql
query Me {
  me {
    id
    name
    email
    # other fields...
  }
}
```

## Debugging Tips

1. **Token Issues**
   - Check localStorage for valid token
   - Verify token expiration
   - Check network requests for Authorization header

2. **Auth State Problems**
   - Use React DevTools to inspect AuthContext state
   - Check Apollo Client cache for user data

3. **Server Errors**
   - Check server logs for authentication errors
   - Verify JWT secret is consistent
