const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// World state stores
const players = {};
const monsters = {};
const resources = {}; // Trees, Rocks, Ores

// Initialize starter resources
function initWorldResources() {
  for (let i = 0; i < 20; i++) {
    const id = `tree_${i}`;
    resources[id] = { id, type: 'tree', x: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200, hp: 100, maxHp: 100, active: true };
  }
  for (let i = 0; i < 15; i++) {
    const id = `rock_${i}`;
    resources[id] = { id, type: 'rock', x: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200, hp: 100, maxHp: 100, active: true };
  }
  for (let i = 0; i < 10; i++) {
    const id = `ore_${i}`;
    resources[id] = { id, type: 'ore', x: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200, hp: 150, maxHp: 150, active: true };
  }

  // Initialize Starter Monsters (Slimes & Goblins)
  for (let i = 0; i < 8; i++) {
    const id = `slime_${i}`;
    monsters[id] = {
      id,
      type: 'Forest Slime',
      x: (Math.random() - 0.5) * 180,
      z: (Math.random() - 0.5) * 180,
      hp: 50,
      maxHp: 50,
      level: 1,
      state: 'roaming'
    };
  }
}
initWorldResources();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
    anim: 'idle',
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    xp: 0,
    level: 1,
    name: `Hero_${socket.id.substring(0, 4)}`,
    inventory: { wood: 5, stone: 5, copper: 2 }
  };

  socket.broadcast.emit('playerJoined', players[socket.id]);
  socket.emit('currentPlayers', players);
  socket.emit('currentMonsters', monsters);
  socket.emit('currentResources', resources);

  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].rotY = data.rotY;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('chatMessage', (data) => {
    const msg = {
      sender: players[socket.id]?.name || 'Unknown',
      text: data.text.substring(0, 200),
      channel: data.channel || 'global',
      time: new Date().toLocaleTimeString()
    };
    io.emit('chatMessage', msg);
  });

  socket.on('harvestResource', (data) => {
    const res = resources[data.id];
    if (res && res.active) {
      res.hp -= 34;
      if (res.hp <= 0) {
        res.active = false;
        // Respawn after 30 seconds
        setTimeout(() => {
          res.hp = res.maxHp;
          res.active = true;
          io.emit('resourceRespawned', res);
        }, 30000);
      }
      io.emit('resourceDamaged', res);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Eclipse Realms survival backend running on port ${PORT}`);
});
