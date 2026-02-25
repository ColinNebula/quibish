const express = require('express');
const router = express.Router();

// Signaling server placeholder
const signalingServer = {
  initialize: (server) => {
    console.log('📡 Signaling server initialized');
  },
  attach: (server) => {
    console.log('📡 Signaling server attached');
  }
};

// Signaling routes
router.post('/offer', (req, res) => {
  res.json({ success: true, message: 'Offer received' });
});

router.post('/answer', (req, res) => {
  res.json({ success: true, message: 'Answer received' });
});

router.post('/ice-candidate', (req, res) => {
  res.json({ success: true, message: 'ICE candidate received' });
});

module.exports = { router, signalingServer };
