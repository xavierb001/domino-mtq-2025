const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const PORT = process.env.PORT || 3000;
const app = express();




//const staticFolder = path.join(__dirname, 'dist');

// Force HTTPS in production
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
  ? "https://hidden-meadow-68185-d2168c8f325d.herokuapp.com" // Mets ton URL Heroku
  : "http://localhost:5173";



// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../domino-frontend/dist')));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://hidden-meadow-68185-d2168c8f325d.herokuapp.com'], 
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://hidden-meadow-68185-d2168c8f325d.herokuapp.com'],
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





let games = {}; // Stockage des parties

// **Initialiser un set complet de dominos**
function initializeDominoSet() {
  const dominoSet = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      dominoSet.push([i, j]);
    }
  }
  return dominoSet;
}

// **Initialiser une partie**
function initializeGame(gameId) {
  games[gameId] = {
    players: [],
    waitingRoom: [], // Liste des joueurs en attente
    table: [],
    consecutivePasses: 0, // Nouveau compteur
    scores: {},
    dominoSet: initializeDominoSet(),
    inProgress: false,
    lastPlayer: null, // Dernier joueur à avoir posé un domino
    observers: [], // Liste des observateurs
  };
  console.log(`[Game] Nouvelle partie initialisée : ${gameId}`);
}

// **Distribuer des dominos à chaque joueur**
function distributeDominos(gameId) {
  const game = games[gameId];
  const dominoSet = [...game.dominoSet];
  game.players.forEach((player) => {
    player.hand = [];
     player.handC=  0;
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * dominoSet.length);
      player.hand.push(dominoSet.splice(randomIndex, 1)[0]);
    }
    player.handC=7;
  });
}

// **Rejoindre une partie**
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Nouvelle connexion : ${socket.id}`);

  socket.on('joinGame', ({ gameId, username }) => {
    if (!gameId || !username) {
      console.error('[Error] ID de partie ou pseudo manquant.');
      return;
    }

    if (!games[gameId]) {
      initializeGame(gameId);
    }

    const game = games[gameId];
 // Rejoindre en tant que joueur
    if (game.players.length < 3) {
      game.players.push({ id: socket.id, username, hand: [], score: 0 });
      socket.join(gameId);

      console.log(`[Game] ${username} a rejoint la partie ${gameId}.`);
      if (game.players.length === 3 && !game.inProgress) {
        game.inProgress = true;
        distributeDominos(gameId);

        game.players.forEach((player) => {
          io.to(player.id).emit('updateHand', player.hand);
        });

        io.to(gameId).emit('startGame', {
          players: game.players.map((p) => ({ username: p.username })),
          table: game.table,
        });
      }
    } else {
      // Rejoindre en tant qu'observateur
      game.observers.push({ id: socket.id, username });
      socket.join(gameId);
      socket.emit('waitingRoom', { message: 'Vous êtes dans la salle d’attente.', gameId });
      socket.emit('observeGame', {
        players: game.players.map((p) => ({
          username: p.username,
          handCount: p.handC,
          score: p.score,
        })),
        table: game.table,
        lastPlayer: game.lastPlayer,
      });
      console.log(`[Game] ${username} observe la partie ${gameId}.`);
    }

    io.to(gameId).emit('updatePlayers', game.players);
  });
 
  // **Jouer un domino**
  socket.on('playDomino', ({ gameId, domino, side }) => {
    const game = games[gameId];
    if (!game || !domino) {
      console.error('[Error] ID de partie ou domino manquant.');
      socket.emit('error', { message: 'Données invalides pour jouer le domino.' });
      return;
    }

    const player = game.players.find((p) => p.id === socket.id);
    if (!player) {
      console.error('[Error] Joueur non trouvé.');
      socket.emit('error', { message: 'Joueur introuvable dans la partie.' });
      return;
    }

    // Si le tableau est vide, ajouter directement le domino
    if (game.table.length === 0) {
      game.table.push(domino);
      game.consecutivePasses = 0;
      player.handC--;
    } else {
      console.log(`test partie fini.`);
      // Vérifier et jouer sur le côté choisi
      if (side === 'left' && (game.table[0][0] === domino[1] || game.table[0][0] === domino[0])) {
        if (game.table[0][0] === domino[1]) {
          game.table.unshift(domino);
          game.consecutivePasses = 0;
          player.handC--;
        } else {
          game.table.unshift([domino[1], domino[0]]);
          game.consecutivePasses = 0;
          player.handC--;
        }
      } else if (side === 'right' && (game.table[game.table.length - 1][1] === domino[0] || game.table[game.table.length - 1][1] === domino[1])) {
        if (game.table[game.table.length - 1][1] === domino[0]) {
          game.table.push(domino);
          game.consecutivePasses = 0;
          player.handC--;
        } else {
          game.table.push([domino[1], domino[0]]);
          game.consecutivePasses = 0;
          player.handC--;
        }
      } else {
        console.error('[Error] Domino non jouable à cet emplacement.');
        socket.emit('error', { message: 'Ce domino ne peut pas être posé ici.' });
        return;
      }
    }

    // Mettre à jour la main du joueur
    player.hand = player.hand.filter((d) => !(d[0] === domino[0] && d[1] === domino[1]));
    
    //console.log(player.hand.length);  
    console.log( "go " + player.handC); 
    // Mettre à jour les joueurs
    game.lastPlayer = player.username;
    console.log(player.handC+ "verif fin");
    // Vérifier si la manche est terminée
    if (player.handC === 0) {
      console.log(`test manche fini.`);
      player.score++;

      // Logique de fin de manche ou de partie
      if (player.score >= 3 || game.players.every((p) => p.score >= 1)) {
        io.to(gameId).emit('gameOver', {
          winner: player.score >= 3 ? player.username : null,
          scores: game.players.map((p) => ({ username: p.username, score: p.score })),
        });
        delete games[gameId];
        return;
      }

      // Réinitialiser pour la prochaine manche
      game.table = [];
      distributeDominos(gameId);
      game.players.forEach((p) => io.to(p.id).emit('updateHand', p.hand));
      io.to(gameId).emit('roundEnd', {
        winner: player.username,
        scores: game.players.map((p) => ({ username: p.username, score: p.score })),
      });
      return;
    }

    // Mettre à jour les joueurs et le plateau
    io.to(gameId).emit('updateGame', {
      table: game.table,
      players: game.players.map((p) => ({
        username: p.username,
        handCount: p.handC,
      })),
      lastPlayer: game.lastPlayer,
    });
  });

// **Passer son tour**
socket.on('passTurn', ({ gameId }) => {
  const game = games[gameId];
  if (!game) {
    console.error('[Error] Partie introuvable.');
    return;
  }

  const player = game.players.find((p) => p.id === socket.id);
  if (!player) {
    console.error('[Error] Joueur non trouvé.');
    return;
  }

  // Initialiser le compteur de passes s'il n'existe pas
  if (!game.consecutivePasses) {
    game.consecutivePasses = 0;
  }

  // Incrémenter le compteur de passes
  game.consecutivePasses++;

  // Notifier les autres joueurs que le joueur a passé son tour
  io.to(gameId).emit('passTurn', { player: player.username });

  console.log(`[Game] Joueur ${player.username} a passé son tour. (${game.consecutivePasses}/${game.players.length})`);
  console.log(game.consecutivePasses);
  // Vérifier si tous les joueurs ont passé leur tour consécutivement
  if (game.consecutivePasses >= game.players.length) {
    console.log(`[Game] Tous les joueurs ont passé leur tour. La manche est terminée.`);
   // io.to(gameId).emit('endRoundNoMoves', { message: "Tous les joueurs ont passé leur tour. Fin de la manche !" });

    // Réinitialiser le compteur pour la prochaine manche
   // game.consecutivePasses = 0;
   io.to(gameId).emit('roundEnd', { winner: "Aucun", message: "Tous les joueurs ont passé leur tour. La manche est terminée." });
   console.log(`test passing`);
   // Réinitialiser le jeu
   games[gameId].table = [];
   games[gameId].consecutivePasses = 0;

  }
});
socket.on('endRoundNoMoves', ({ gameId }) => {
  if (!games[gameId]) return;

  io.to(gameId).emit('roundEnd', { winner: "Aucun", message: "Tous les joueurs ont passé leur tour. La manche est terminée." });
  console.log(`test passing2`);
  // Réinitialiser le jeu
  games[gameId].table = [];
  games[gameId].consecutivePasses = 0;
});


  // **Démarrer une nouvelle manche**
  socket.on('startNewRound', ({ gameId }) => {
    const game = games[gameId];
    if (!game) {
      console.error('[Error] Partie introuvable.');
      return;
    }

    // Réinitialiser la table et distribuer les dominos
    game.table = [];
    distributeDominos(gameId);
   // distributeDominos(gameId);
    game.players.forEach((p) => io.to(p.id).emit('updateHand', p.hand));

    io.to(gameId).emit('newRoundStarted', {
      table: game.table,
      players: game.players.map((p) => ({
        username: p.username,
        handCount: p.handC,
      })),
    });

    console.log(`[Game] Nouvelle manche commencée pour la partie ${gameId}`);
  });

  // **Déconnexion**
  // **Gérer le départ d'un joueur**
 
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Déconnexion : ${socket.id}`);
    for (const gameId in games) {
      const game = games[gameId];
      if (!game) continue; // Si la partie n'existe pas, on ignore

      // Retirer le joueur ou observateur déconnecté
      const playerIndex = game.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        console.log(`joueur déco`);

        // Vérifier s'il y a des observateurs pour remplacer le joueur
        if (game.observers.length > 0) {
          console.log(`test ajout de jouer `);
          const newPlayer = game.observers.shift();
          game.players.push({ id: newPlayer.id, username: newPlayer.username, hand: [], score: 0 });
          distributeDominos(gameId);
          io.to(newPlayer.id).emit('updateHand', []);
          console.log(`[Game] ${newPlayer.username} a remplacé un joueur dans la partie ${gameId}.`);


        // Mettez à jour les mains des joueurs
        game.players.forEach((player) => {
          io.to(player.id).emit('updateHand', player.hand);
        });
        // Réinitialisez la partie
        game.table = [];
        game.scores = {};
        distributeDominos(gameId);




          io.to(gameId).emit('startGame', {
            players: game.players.map((p) => ({ username: p.username })),
            table: game.table,
          });
        }
      } else {
        // Retirer l'observateur déconnecté
        game.observers = game.observers.filter((obs) => obs.id !== socket.id);
      }

      if (game.players.length === 0 && game.observers.length === 0) {
        delete games[gameId];
      } else {
        io.to(gameId).emit('updatePlayers', game.players);
      }
    }})
  });


// **Gérer les messages de chat**
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Nouvelle connexion : ${socket.id}`);

  socket.on('sendMessage', ({ gameId, username, message }) => {
    if (games[gameId]) {
      io.to(gameId).emit('receiveMessage', { username, message }); // Diffuser le message à tous les joueurs
      console.log(`[Chat] Message de ${username} dans la partie ${gameId} : ${message}`);
    } else {console.error(`[Error] Partie non trouvée pour l'ID : ${gameId}`);
    return;}
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Déconnexion : ${socket.id}`);
  });
});

// Gérer le signaling pour WebRTC
io.on('connection', (socket) => {
  socket.on('signal', ({ gameId, signal, to }) => {
    io.to(to).emit('signal', { signal, from: socket.id });
  });

  socket.on('joinVoiceChannel', ({ gameId }) => {
    socket.join(gameId);
    const players = [...io.sockets.adapter.rooms.get(gameId)]; // Liste des joueurs dans la salle
    socket.emit('playersInRoom', players.filter((id) => id !== socket.id));
  });
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Déconnexion : ${socket.id}`);
  });
});


// Servir l'application frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../domino-frontend/dist/index.html'));
});

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  console.log(`🌍 Frontend accessible sur : ${FRONTEND_URL}`);
});

// Optionnel : Une route 404 pour toutes les autres requêtes
app.use((req, res) => {
  res.status(404).send('Route non définie.');
});

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});