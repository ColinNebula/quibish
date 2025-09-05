const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createApolloServer } = require('./graphql');
// Lightweight WebSocket server for demo/live updates
const http = require('http');
let wss = null;

const app = express();
const PORT = 5000;

// Configure middleware first
app.use(cors({ origin: '*' })); // allow all origins with more explicit config
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length) {
    console.log('Request body:', JSON.stringify(req.body));
  }
  next();
});

// Simple in-memory user store (for demo)
const users = [
  { id: 1, username: 'alice', password: 'password123', email: 'alice@example.com', createdAt: '2025-08-20T10:00:00Z' },
  { id: 2, username: 'bob', password: 'password456', email: 'bob@example.com', createdAt: '2025-08-21T14:30:00Z' }
];

// Function to persist users to a JSON file (for demo purposes)
const fs = require('fs');

const saveUsersToFile = () => {
  try {
    const dataPath = path.join(__dirname, 'data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    fs.writeFileSync(
      path.join(dataPath, 'users.json'), 
      JSON.stringify(users, null, 2)
    );
    console.log('Users data saved to file');
  } catch (err) {
    console.error('Error saving users to file:', err);
  }
};

// Load users from file if it exists
try {
  const dataPath = path.join(__dirname, 'data', 'users.json');
  if (fs.existsSync(dataPath)) {
    const userData = fs.readFileSync(dataPath, 'utf8');
    const loadedUsers = JSON.parse(userData);
    // Only replace users array if data was loaded successfully
    if (Array.isArray(loadedUsers) && loadedUsers.length > 0) {
      users.length = 0; // Clear array
      loadedUsers.forEach(user => users.push(user));
      console.log(`Loaded ${users.length} users from file`);
    }
  }
} catch (err) {
  console.error('Error loading users from file:', err);
}

// Simple ping endpoint for connection testing
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User endpoints
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  // Return user without password
  const { password, ...userData } = user;
  res.json({
    success: true,
    user: userData
  });
});

// Get all users (for admin purposes, in a real app this would be protected)
app.get('/api/users', (req, res) => {
  // Return users without passwords
  const safeUsers = users.map(({ password, ...userData }) => userData);
  res.json({
    success: true,
    users: safeUsers
  });
});

// Login endpoint - allows login with either username or email
app.post('/api/login', (req, res) => {
  console.log('Login attempt received:', req.body);
  const { username, password } = req.body;
  
  // Enhanced validation with descriptive errors
  if (!username) {
    console.log('Login failed: Missing username/email');
    return res.status(400).json({ 
      success: false,
      error: 'Username or email is required' 
    });
  }
  
  if (!password) {
    console.log('Login failed: Missing password');
    return res.status(400).json({ 
      success: false,
      error: 'Password is required' 
    });
  }
  
  // Check if username is actually an email
  const isEmail = username.includes('@');
  console.log(`Attempting login with ${isEmail ? 'email' : 'username'}: ${username}`);
  
  // First check if user exists (without checking password yet)
  const userExists = users.some(u => u.username === username || u.email === username);
  if (!userExists) {
    console.log('Login failed: User not found');
    return res.status(401).json({
      success: false,
      error: 'No account found with that username/email'
    });
  }
  
  // Now check credentials
  const user = users.find(u => 
    (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) 
    && u.password === password
  );
  
  if (!user) {
    console.log('Login failed: Incorrect password');
    return res.status(401).json({ 
      success: false,
      error: 'Incorrect password' 
    });
  }
  
  // Update last login time
  user.lastLoginAt = new Date().toISOString();
  
  // Persist updated user data
  saveUsersToFile();
  
  console.log('Login successful for user:', user.username);
  // In a real app, return a JWT or session token
  res.status(200).json({ 
    success: true,
    user: { 
      id: user.id,
      username: user.username, 
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLoginAt
    }, 
    token: 'demo-token-' + Date.now().toString().slice(-6)  // Make token slightly unique
  });
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  console.log('Registration attempt received:', req.body);
  const { username, email, password } = req.body;
  
  // Enhanced validation
  if (!username) {
    console.log('Registration failed: Missing username');
    return res.status(400).json({ 
      success: false,
      error: 'Username is required' 
    });
  }
  
  if (!email) {
    console.log('Registration failed: Missing email');
    return res.status(400).json({ 
      success: false,
      error: 'Email is required' 
    });
  }
  
  if (!password) {
    console.log('Registration failed: Missing password');
    return res.status(400).json({ 
      success: false,
      error: 'Password is required' 
    });
  }
  
  if (username.length < 3) {
    console.log('Registration failed: Username too short');
    return res.status(400).json({
      success: false,
      error: 'Username must be at least 3 characters'
    });
  }
  
  if (password.length < 6) {
    console.log('Registration failed: Password too short');
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters'
    });
  }
  
  if (!/\S+@\S+\.\S+/.test(email)) {
    console.log('Registration failed: Invalid email format');
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address'
    });
  }
  
  // Check if username already exists
  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    console.log('Registration failed: Username already taken');
    return res.status(400).json({ 
      success: false,
      error: 'Username already taken' 
    });
  }
  
  // Check if email already exists
  if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
    console.log('Registration failed: Email already registered');
    return res.status(400).json({ 
      success: false,
      error: 'Email already registered' 
    });
  }
  
  // Create new user with additional fields
  const newUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
  
  const newUser = { 
    id: newUserId,
    username, 
    email, 
    password, 
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  // Persist users to file
  saveUsersToFile();
  
  console.log('Registration successful for user:', username);
  
  // In a real app, you would hash the password and generate a real JWT
  res.status(201).json({ 
    success: true,
    user: { 
      id: newUser.id,
      username: newUser.username, 
      email: newUser.email,
      createdAt: newUser.createdAt
    }, 
    token: 'demo-token-' + Date.now().toString().slice(-6)
  });
});

// In-memory storage for demo
let messages = [
  { id: 1, text: 'Welcome to Quibish!', sender: 'system', type: 'text' }
];
let photos = [];

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const { text, sender, type } = req.body;
  const msg = {
    id: Date.now(),
    text,
    sender,
    type: type || 'text',
    timestamp: new Date().toISOString()
  };
  messages.push(msg);
  res.json(msg);
});

app.get('/api/photos', (req, res) => {
  res.json(photos);
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const photo = {
    id: Date.now(),
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    timestamp: new Date().toISOString(),
    sender: 'me'
  };
  photos.push(photo);
  messages.push({ id: photo.id, text: photo.name, sender: 'me', type: 'photo', url: photo.url, timestamp: photo.timestamp });
  res.json(photo);
});

// Initialize Apollo Server and start the Express server
const startServer = async () => {
  try {
    // Apply Apollo GraphQL middleware
    await createApolloServer(app);
    
    // Start the HTTP server (so we can attach WebSocket server)
      const server = http.createServer(app);

      // Attach WebSocket server lazily (require 'ws' only when starting)
      try {
        const { WebSocketServer } = require('ws');

        wss = new WebSocketServer({ noServer: true });

        // Handle basic ws upgrade and route to /ws
        server.on('upgrade', (request, socket, head) => {
          const { url } = request;
          if (url === '/ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit('connection', ws, request);
            });
          } else {
            socket.destroy();
          }
        });

        // Basic ws connection handlers
        wss.on('connection', (ws, req) => {
          console.log('WebSocket client connected');
          ws.isAlive = true;

          ws.on('message', (message) => {
            // simple JSON ping/pong or echo
            try {
              const data = JSON.parse(message.toString());
              if (data && data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                return;
              }
            } catch (e) {
              // non-JSON messages: ignore or echo
            }
            // echo message for demo
            ws.send(message.toString());
          });

          ws.on('pong', () => {
            ws.isAlive = true;
          });

          ws.on('close', () => {
            console.log('WebSocket client disconnected');
          });
        });

        // Heartbeat to clean dead connections
        const interval = setInterval(() => {
          if (!wss) return;
          wss.clients.forEach((socket) => {
            if (socket.isAlive === false) return socket.terminate();
            socket.isAlive = false;
            socket.ping();
          });
        }, 30000);

        wss.on('close', () => clearInterval(interval));
      } catch (err) {
        console.warn('ws package not installed; WebSocket endpoint disabled');
      }

      server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
        if (wss) console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
      });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
