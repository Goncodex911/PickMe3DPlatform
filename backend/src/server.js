require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const collaborationServer = require('./services/collaborationServer');

// Connect to MongoDB Atlas
if (process.env.MONGODB_URI) {
  connectDB();
} else {
  console.warn('⚠️  MONGODB_URI not found in environment variables. Database not connected.');
}

const app = express();
const server = http.createServer(app);

// Initialize Real-time Multiplayer Collaboration Engine via Socket.io
collaborationServer.init(server);

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', routes);

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 PickMe3D Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket / Socket.io Multiplayer Collaboration Ready`);
});
