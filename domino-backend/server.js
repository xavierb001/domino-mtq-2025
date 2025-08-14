// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

////////////////////////////////////////////////////////////////////////////////
// HTTPS (prod)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

const FRONTEND_URL = process.env.NODE_ENV === "production"
  ? "https://domino-martinique.onrender.com"
  : "http://localhost:5173";

////////////////////////////////////////////////////////////////////////////////
// Static front
app.use(express.static(path.join(__dirname, '../domino-frontend/dist')));

////////////////////////////////////////////////////////////////////////////////
// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://domino-martinique.onrender.com'],
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

////////////////////////////////////////////////////////////////////////////////
// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://domino-martinique.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    cookie: {
      name: "socket-io",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    }
  }
});

////////////////////////////////////////////////////////////////////////////////
// Game state
const REQUIRED_PLAYERS = 3;
const RECONNECT_GRACE_MS = 2 * 60 * 1000; // 2 minutes

let games = {}; // { [gameId]: GameState }

function initializeDominoSet() {
  const dominoSet = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      dominoSet.push([i, j]);
    }
  }
  return dominoSet;
}

function initializeGame(gameId) {
  games[gameId] = {
    players: [],         // [{ userId, id: socketId|null, username, connected, hand, handC, score }]
    observers: [],       // [{ id: socketId, username }]
    table: [],
    consecutivePasses: 0,
    dominoSet: initializeDominoSet(),
    inProgress: false,
    lastPlayer: null,
    reconnectTimers: {}, // userId -> setTimeout handle
  };
  console.log(`[Game] Nouvelle partie initialisée : ${gameId}`);
}

function distributeDominos(gameId) {
  const game = games[gameId];
  const dominoSet = [...initializeDominoSet()]; // reset complet à chaque manche
  game.players.forEach((player) => {
    player.hand = [];
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * dominoSet.length);
      player.hand.push(dominoSet.splice(randomIndex, 1)[0]);
    }
    player.handC = player.hand.length;
  });
}

function connectedCount(game) {
  return game.players.filter(p => p.connected).length;
}

function broadcastPlayers(gameId) {
  const game = games[gameId];
  if (!game) return;
  io.to(gameId).emit('updatePlayers', game.players.map(p => ({
    userId: p.userId,
    username: p.username,
    score: p.score,
    connected: p.connected
  })));
}

function pauseGame(gameId, reason = 'Partie en pause.') {
  const game = games[gameId];
  if (!game) return;
  if (game.inProgress) {
    game.inProgress = false;
    io.to(gameId).emit('gamePaused', { reason });
  }
  io.to(gameId).emit('waitingForPlayers', {
    needed: Math.max(0, REQUIRED_PLAYERS - connectedCount(game)),
    players: game.players.map(p => ({ username: p.username, connected: p.connected })),
  });
  broadcastPlayers(gameId);
}

function startNewRound(gameId) {
  const game = games[gameId];
  if (!game) return;
  // On démarre uniquement si 3 connectés
  if (connectedCount(game) < REQUIRED_PLAYERS) {
    pauseGame(gameId, 'En attente du 3ᵉ joueur pour démarrer la manche.');
    return;
  }
  game.table = [];
  game.consecutivePasses = 0;
  game.inProgress = true;

  distributeDominos(gameId);

  // Envoie chaque main de façon privée
  game.players.forEach((p) => {
    if (p.connected && p.id) {
      io.to(p.id).emit('updateHand', p.hand);
    }
  });

  io.to(gameId).emit('newRoundStarted', {
    table: game.table,
    players: game.players.map(p => ({
      username: p.username,
      handCount: p.handC,
      score: p.score,
      connected: p.connected
    })),
  });
  broadcastPlayers(gameId);
}

function tryStartOrResume(gameId) {
  const game = games[gameId];
  if (!game) return;
  if (connectedCount(game) >= REQUIRED_PLAYERS) {
    // Si la partie n’est pas en cours, on (re)démarre une manche
    if (!game.inProgress) {
      startNewRound(gameId);
    }
  } else {
    pauseGame(gameId, 'En attente de joueurs pour continuer.');
  }
}

////////////////////////////////////////////////////////////////////////////////
// Socket.IO single connection block
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Nouvelle connexion : ${socket.id}`);

  // --- JOIN GAME (avec userId persistant) ---
  socket.on('joinGame', ({ gameId, username, userId }) => {
    if (!gameId || !username || !userId) {
      console.error('[Error] gameId / username / userId manquant.');
      return;
    }
    if (!games[gameId]) initializeGame(gameId);
    const game = games[gameId];

    socket.join(gameId);

    // Reconnexion (même siège) ?
    let player = game.players.find(p => p.userId === userId);
    if (player) {
      // Annule le timer d’abandon si présent
      const t = game.reconnectTimers[userId];
      if (t) {
        clearTimeout(t);
        delete game.reconnectTimers[userId];
      }
      // Rattache le nouveau socket
      player.id = socket.id;
      player.connected = true;
      player.username = username || player.username;

      // Renvoyer sa main et l’état
      io.to(player.id).emit('updateHand', player.hand || []);
      io.to(gameId).emit('playerReconnected', { username: player.username });

      console.log(`[Game] ${player.username} s’est reconnecté sur ${gameId}.`);
      tryStartOrResume(gameId);
      broadcastPlayers(gameId);
      return;
    }

    // Nouvelle place si siège libre
    if (game.players.length < REQUIRED_PLAYERS) {
      player = {
        userId,
        id: socket.id,
        username,
        connected: true,
        hand: [],
        handC: 0,
        score: 0,
      };
      game.players.push(player);
      console.log(`[Game] ${username} a rejoint ${gameId} (${game.players.length}/${REQUIRED_PLAYERS}).`);

      if (game.players.length === REQUIRED_PLAYERS && connectedCount(game) === REQUIRED_PLAYERS) {
        // Première fois qu’on atteint 3 : on lance la manche
        startNewRound(gameId);
      } else {
        pauseGame(gameId, 'En attente de joueurs pour commencer.');
      }
      broadcastPlayers(gameId);
      return;
    }

    // Sinon, observateur
    game.observers.push({ id: socket.id, username });
    socket.emit('waitingRoom', { message: 'Vous êtes dans la salle d’attente.', gameId });
    socket.emit('observeGame', {
      players: game.players.map((p) => ({
        username: p.username,
        handCount: p.handC,
        score: p.score,
        connected: p.connected
      })),
      table: game.table,
      lastPlayer: game.lastPlayer,
    });
    console.log(`[Game] ${username} observe ${gameId}.`);
    broadcastPlayers(gameId);
  });

  // --- PLAY DOMINO ---
  socket.on('playDomino', ({ gameId, domino, side }) => {
    const game = games[gameId];
    if (!game || !Array.isArray(domino)) return;
    if (!game.inProgress) {
      socket.emit('error', { message: 'La partie est en pause.' });
      return;
    }

    const player = game.players.find((p) => p.id === socket.id && p.connected);
    if (!player) {
      socket.emit('error', { message: 'Joueur introuvable ou déconnecté.' });
      return;
    }

    if (game.table.length === 0) {
      game.table.push(domino);
      game.consecutivePasses = 0;
      player.handC--;
    } else {
      const leftVal = game.table[0][0];
      const rightVal = game.table[game.table.length - 1][1];

      if (side === 'left' && (leftVal === domino[1] || leftVal === domino[0])) {
        game.table.unshift(leftVal === domino[1] ? domino : [domino[1], domino[0]]);
        player.handC--;
        game.consecutivePasses = 0;
      } else if (side === 'right' && (rightVal === domino[0] || rightVal === domino[1])) {
        game.table.push(rightVal === domino[0] ? domino : [domino[1], domino[0]]);
        player.handC--;
        game.consecutivePasses = 0;
      } else {
        socket.emit('error', { message: 'Ce domino ne peut pas être posé ici.' });
        return;
      }
    }

    // Retire le domino de la main
    player.hand = player.hand.filter(d => !(d[0] === domino[0] && d[1] === domino[1]));
    game.lastPlayer = player.username;

    // Fin de manche si main vide
    if (player.handC === 0) {
      player.score++;
      const scoresPayload = game.players.map(p => ({ username: p.username, score: p.score }));

      if (player.score >= 3) {
        io.to(gameId).emit('gameOver', { winner: player.username, scores: scoresPayload });
        delete games[gameId];
        return;
      }

      io.to(gameId).emit('roundEnd', { winner: player.username, scores: scoresPayload });
      startNewRound(gameId);
      return;
    }

    // Mise à jour plateau
    io.to(gameId).emit('updateGame', {
      table: game.table,
      players: game.players.map((p) => ({
        username: p.username,
        handCount: p.handC,
        connected: p.connected
      })),
      lastPlayer: game.lastPlayer,
    });
  });

  // --- PASS TURN ---
  socket.on('passTurn', ({ gameId }) => {
    const game = games[gameId];
    if (!game || !game.inProgress) return;

    const player = game.players.find((p) => p.id === socket.id && p.connected);
    if (!player) return;

    game.consecutivePasses = (game.consecutivePasses || 0) + 1;
    io.to(gameId).emit('passTurn', { player: player.username });

    if (game.consecutivePasses >= connectedCount(game)) {
      io.to(gameId).emit('roundEnd', { winner: 'Aucun', message: 'Tous les joueurs ont passé.' });
      startNewRound(gameId);
    }
  });

  // --- START NEW ROUND (bouton manuel côté client si besoin) ---
  socket.on('startNewRound', ({ gameId }) => startNewRound(gameId));

  // --- CHAT ---
  socket.on('sendMessage', ({ gameId, username, message }) => {
    if (games[gameId]) {
      io.to(gameId).emit('receiveMessage', { username, message });
    }
  });

  // --- WEBRTC SIGNALING ---
  socket.on('signal', ({ gameId, signal, to }) => {
    io.to(to).emit('signal', { signal, from: socket.id });
  });

  socket.on('joinVoiceChannel', ({ gameId }) => {
    socket.join(gameId);
    const players = [...io.sockets.adapter.rooms.get(gameId)];
    socket.emit('playersInRoom', players.filter(id => id !== socket.id));
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Déconnexion : ${socket.id}`);

    for (const gameId in games) {
      const game = games[gameId];
      if (!game) continue;

      // Marque le joueur comme déconnecté (sans supprimer le siège)
      const player = game.players.find(p => p.id === socket.id && p.connected);
      if (player) {
        player.connected = false;
        player.id = null;
        io.to(gameId).emit('playerDisconnected', { username: player.username });
        pauseGame(gameId, `${player.username} a quitté la partie. Siège réservé ${RECONNECT_GRACE_MS / 1000}s.`);

        // Lance un timer de grâce pour libérer le siège si pas de reconnexion
        if (game.reconnectTimers[player.userId]) {
          clearTimeout(game.reconnectTimers[player.userId]);
        }
        game.reconnectTimers[player.userId] = setTimeout(() => {
          // Si toujours déconnecté, on libère le siège
          const still = game.players.find(p => p.userId === player.userId);
          if (still && !still.connected) {
            game.players = game.players.filter(p => p.userId !== player.userId);
            delete game.reconnectTimers[player.userId];
            io.to(gameId).emit('seatFreed', { username: player.username });

            // Si plus personne du tout
            if (game.players.length === 0 && game.observers.length === 0) {
              delete games[gameId];
            } else {
              pauseGame(gameId, 'Siège libéré. En attente du 3ᵉ joueur.');
            }
          }
        }, RECONNECT_GRACE_MS);
      } else {
        // Retire un observateur qui se déconnecte
        const before = game.observers.length;
        game.observers = game.observers.filter(o => o.id !== socket.id);
        if (before !== game.observers.length) {
          // rien de spécial à faire
        }
      }
    }
  });
});

////////////////////////////////////////////////////////////////////////////////
// Front fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../domino-frontend/dist/index.html'));
});

////////////////////////////////////////////////////////////////////////////////
// Start
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  console.log(`🌍 Frontend accessible sur : ${FRONTEND_URL}`);
});

////////////////////////////////////////////////////////////////////////////////
// 404 (optionnel)
app.use((req, res) => {
  res.status(404).send('Route non définie.');
});
