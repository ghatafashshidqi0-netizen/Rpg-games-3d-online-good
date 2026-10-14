const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Game World State
const players = {};
const enemies = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Initialize player state
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
    anim: 'idle',
    hp: 100,
    maxHp: 100,
    name: `Hero_${socket.id.substring(0, 4)}`,
    class: 'Warrior',
    level: 1
  };

  // Broadcast new player to others
  socket.broadcast.emit('playerJoined', players[socket.id]);

  // Send current world state to new player
  socket.emit('currentPlayers', players);
  socket.emit('currentEnemies', enemies);

  // Handle player movement & rotation
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      players[socket.id].rotY = movementData.rotY;
      players[socket.id].anim = movementData.anim;

      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // Handle combat actions
  socket.on('playerAttack', (attackData) => {
    socket.broadcast.emit('playerAttacked', {
      id: socket.id,
      combo: attackData.combo
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Eclipse Realms server running on port ${PORT}`);
});
