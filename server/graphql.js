const { ApolloServer, gql } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock user database
let users = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: '$2a$10$6hWE8WLgGcdYu3xVGDOqgOiZ9X4Dc2yK2K86P4xqxVlGkKvfSgw4y', // hashed 'password123'
    avatar: null,
    status: 'online',
    role: 'User',
    statusMessage: 'Working on QuibiChat',
    bio: 'Software developer passionate about creating great user experiences.',
    location: 'San Francisco, CA',
    company: 'Tech Innovations Inc.',
    website: 'https://johndoe.dev',
    theme: 'light',
    notifications: true,
    language: 'en',
    lastActive: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: '$2a$10$6hWE8WLgGcdYu3xVGDOqgOiZ9X4Dc2yK2K86P4xqxVlGkKvfSgw4y', // hashed 'password123'
    avatar: null,
    status: 'busy',
    role: 'Admin',
    statusMessage: 'In a meeting',
    bio: 'UX designer with a passion for creating intuitive interfaces.',
    location: 'New York, NY',
    company: 'Design Masters',
    website: 'https://janesmith.design',
    theme: 'dark',
    notifications: true,
    language: 'en',
    lastActive: new Date().toISOString()
  }
];

// JWT secret key
const JWT_SECRET = 'quibichat-secret-key';

// GraphQL type definitions
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
    status: String
    role: String
    statusMessage: String
    bio: String
    location: String
    company: String
    website: String
    theme: String
    notifications: Boolean
    language: String
    lastActive: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type LogoutResponse {
    success: Boolean!
    message: String
  }

  type Query {
    me: User
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload
    register(name: String!, email: String!, password: String!): AuthPayload
    logout: LogoutResponse
    updateUser(id: ID!, name: String, statusMessage: String, bio: String, theme: String): User
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    me: (_, __, { user }) => {
      if (!user) return null;
      return users.find(u => u.id === user.id);
    },
    users: () => users,
    user: (_, { id }) => users.find(u => u.id === id)
  },
  Mutation: {
    login: async (_, { email, password }) => {
      // Find user by email
      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid password');
      }

      // Generate JWT token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

      // Update last active
      user.lastActive = new Date().toISOString();
      user.status = 'online';

      return {
        token,
        user: {
          ...user,
          password: undefined // Don't return the password
        }
      };
    },
    register: async (_, { name, email, password }) => {
      // Check if email already exists
      if (users.find(u => u.email === email)) {
        throw new Error('Email already in use');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = {
        id: String(users.length + 1),
        name,
        email,
        password: hashedPassword,
        avatar: null,
        status: 'online',
        role: 'User',
        statusMessage: 'Available',
        bio: '',
        location: '',
        company: '',
        website: '',
        theme: 'light',
        notifications: true,
        language: 'en',
        lastActive: new Date().toISOString()
      };

      // Add user to database
      users.push(newUser);

      // Generate JWT token
      const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '24h' });

      return {
        token,
        user: {
          ...newUser,
          password: undefined // Don't return the password
        }
      };
    },
    logout: (_, __, { user }) => {
      if (user) {
        // Find the user and update status
        const userToUpdate = users.find(u => u.id === user.id);
        if (userToUpdate) {
          userToUpdate.status = 'offline';
          return { success: true, message: 'Successfully logged out' };
        }
      }
      return { success: false, message: 'No active session' };
    },
    updateUser: (_, args, { user }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Find user to update
      const userToUpdate = users.find(u => u.id === args.id);
      if (!userToUpdate) {
        throw new Error('User not found');
      }

      // Check if current user is updating their own profile
      if (user.id !== args.id) {
        throw new Error('Cannot update other users');
      }

      // Update fields
      Object.keys(args).forEach(key => {
        if (key !== 'id' && args[key] !== undefined) {
          userToUpdate[key] = args[key];
        }
      });

      return userToUpdate;
    }
  }
};

// Context function to extract user from auth token
const context = ({ req }) => {
  const token = req.headers.authorization?.split(' ')[1] || '';
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { user: { id: decoded.id } };
    } catch (e) {
      return { user: null };
    }
  }
  return { user: null };
};

// Create Apollo Server
const createApolloServer = async (app) => {
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers, 
    context 
  });
  
  await server.start();
  server.applyMiddleware({ app });
  
  return server;
};

module.exports = { createApolloServer };
