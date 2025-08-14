import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import Board from '../components/Board';
import Chat from '../components/Chat'; // Chemin du composant Chat
import imageFondJeu from '../assets/images/imagefond_jeu.png'; // Import de l'image de fond
import iconeMessage from '../assets/images/icone_message.png';
//import dominoBack from '../assets/images/dominos/domino_back.png'; // Image pour représenter les dominos des autres joueurs
import iconeMessageNotif from '../assets/images/icone_message_notif.png'; // ✅ Nouvelle icône de notification
import "../styles/game.css"; 
import ResultPopup from '../components/ResultPopup';
import '../styles/popup.css';


import shareIcon from '../assets/images/share_icon.png'; // Assure-toi d'avoir une icône de partage
const imageFondJeuUrl = "https://res.cloudinary.com/dwvfz8o89/image/upload/f_auto,q_auto/v1/domino/n39kvljl1qutdoorce3z";
const dominoBack = "https://res.cloudinary.com/dwvfz8o89/image/upload/f_auto,q_auto/v1/domino/dominos/zclnlh38fxlo8ektqzww";
function Game() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [dominos, setDominos] = useState([]);
  // eslint-disable-next-line
  const [playerHand, setPlayerHand] = useState([]);
  const [lastPlayer, setLastPlayer] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [passingPlayer, setPassingPlayer] = useState(null);
  const [waitingRoomMessage, setWaitingRoomMessage] = useState('Vous êtes dans la salle d’attente.'); // Message de salle d'attente
  const [isChatboxVisible, setIsChatboxVisible] = useState(false); // État de visibilité de la chatbox
  const [messages, setMessages] = useState([]); // État global des messages du chat
  const [consecutivePasses, setConsecutivePasses] = useState(0); // Nombre de passes consécutives
  const [newMessageReceived, setNewMessageReceived] = useState(false); // ✅ État pour indiquer un nouveau message


  const copyGameLink = () => {
    const gameLink = window.location.href; // URL actuelle de la partie
    navigator.clipboard.writeText(`Rejoignez ma partie de dominos ici : ${gameLink}`)
      .then(() => {
        alert("Lien de la partie copié ! Partagez-le avec vos amis.");
      })
      .catch(err => {
        console.error("Erreur lors de la copie du lien :", err);
      });
  };

// Fonction pour gérer le clic sur l'icône
  const toggleChatbox = () => {
  setIsChatboxVisible((prev) => !prev);
  setNewMessageReceived(false); // ✅ Réinitialiser l'alerte
  };
  const joinGame = () => {
    if (username.trim()) {
      socket.emit('joinGame', { gameId, username });
      setJoined(true);
    } else {
      alert('Veuillez entrer un pseudo avant de rejoindre.');
    }
  };

  const leaveGame = () => {
    socket.emit('leaveGame', { gameId });
    navigate('/');
  };

  const passTurn = () => {
    socket.emit('passTurn', { gameId });
    setPassingPlayer(username);
    
    setConsecutivePasses((prevPasses) => {
      const newPasses = prevPasses + 1;
  
      if (newPasses >= players.length) {
        socket.emit('endRoundNoMoves', { gameId }); // Envoyer un signal pour terminer la manche
        return 0; // Réinitialiser après l’envoi de l’événement
      }
      
      return newPasses;
    });
  };

  const playDomino = (domino, side) => {
    socket.emit('playDomino', { gameId, domino, side });
    setConsecutivePasses(0); // Réinitialiser les passes consécutives
  };

  const startNewRound = () => {
    socket.emit('startNewRound', { gameId });
  };

  useEffect(() => {

    
    socket.on('updatePlayers', (data) => {
      setPlayers(
        data.map((player) => ({
          ...player,
          //handCount: player.hand?.length || 0,
        }))
      );
    });

    socket.on('startGame', ({ players, table }) => {
      setPlayers(
        players.map((player) => ({
          ...player,
         // handCount: player.hand?.length || 0,
        }))
      );
      setDominos(table);
      setWaitingRoomMessage(''); // Efface le message si la partie commence

      const currentPlayer = players.find((player) => player.username === username);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.hand || []);
      }
    });
    socket.on('waitingRoom', ({ message }) => {
      setWaitingRoomMessage(message); // Définit le message pour les observateurs
    });
    

    socket.on('updateGame', ({ table, players, lastPlayer }) => {
      setDominos(table);
      const currentPlayer = players.find((player) => player.username === username);
      if (currentPlayer) {
        setPlayerHand(currentPlayer.hand || []);
      }
      setPlayers(
        players.map((player) => ({
          ...player,
        // handCount: playerHand.length || 0,
        }))
      );
      setLastPlayer(lastPlayer);
      setPassingPlayer(null);


    });
    socket.on('observeGame', ({ players, table, lastPlayer }) => {
      setPlayers(players);
      setDominos(table);
      setLastPlayer(lastPlayer);
    });

    socket.on('passTurn', ({ player }) => {
      setPassingPlayer(player);
    });

    socket.on('roundEnd', ({ winner, scores }) => {
      setRoundResult({ winner, scores });
    });

    socket.on('gameOver', ({ winner, scores }) => {
      setGameResult({ winner, scores });
    });

    socket.on('newRoundStarted', ({ table, players }) => {
      setDominos(table);
      setPlayers(players);
      setPassingPlayer(null);
      setRoundResult(null);
    });

    socket.on('connect_error', () => {
      setError('Impossible de se connecter au serveur.');
    });

    socket.on('error', (errMsg) => {
      setError(errMsg);
    });
    // Écoute pour les messages du chat
    socket.on('receiveMessage', ({ username, message }) => {
    setMessages((prevMessages) => [...prevMessages, { username, message }]);
    if (!isChatboxVisible) {
      setNewMessageReceived(true); // ✅ Active l'alerte si la chatbox est fermée
    }
    });



    return () => {
      socket.off('updatePlayers');
      socket.off('startGame');
      socket.off('waitingRoom');
      socket.off('updateGame');
      socket.off('roundEnd');
      socket.off('gameOver');
      socket.off('newRoundStarted');
      socket.off('passTurn');
      socket.off('observeGame');
      socket.off('connect_error');
      socket.off('error');
      socket.off('receiveMessage'); // Nettoyage des messages
    };
  
  }, [gameId, username, isChatboxVisible]);

  useEffect(() => {
    const lockOrientation = () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("portrait").catch(err => console.log(err));
      }
    };
  
    lockOrientation();
    window.addEventListener("resize", lockOrientation);
  
    return () => {
      window.removeEventListener("resize", lockOrientation);
    };
  }, []);

  const otherPlayers = players.filter((player) => player.username !== username);

  return (
    <div style={{     width: '100vw', // Prend toute la largeur de l'écran
      height: '100vh',
      textAlign: 'center', marginTop: '50px',         backgroundImage: `url(${imageFondJeuUrl})`, // Image de fond
    backgroundSize: 'cover', // Couvrir tout l'écran
    backgroundPosition: 'center', // Centrer l'image
    backgroundRepeat: 'no-repeat', // Éviter la répétition
    minHeight: '100vh', // S'assurer que le conteneur couvre toute la hauteur
   //width: '100vw', // Assure que le conteneur couvre toute la largeur visible
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', }}>
      {error && <div style={{ color: 'red' }}>{error}</div>}
 
      {waitingRoomMessage && (
        <div style={{ color: 'blue', marginBottom: '20px' }}>
          <strong>{waitingRoomMessage}</strong>

{/* Bouton de partage */}
<p> <button onClick={copyGameLink} style={{
      padding: '10px',
      fontSize: '16px', // Empêche le zoom automatique
      marginBottom: '10px',
      cursor: 'pointer',
      border: 'none',
      background: 'none'
    }}>
      <img src={shareIcon} alt="Partager" style={{ width: '32px', height: '32px' }} /> INVITE DES JOUEURS
    </button></p>


        </div>
      )}

{(roundResult || gameResult) && (
  <ResultPopup
    roundResult={roundResult}
    gameResult={gameResult}
    username={username}
    startNewRound={startNewRound}
  />
)}

      {!joined ? (
        <div>
          <h1>Rejoindre la partie : {gameId}</h1>
          <input 
          
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                joinGame();
              }
            }}
            placeholder="Entrez votre pseudo"
          />

        </div>
      ) : (
        <div>
         {/* <h1 style={{ fontSize: '0.6em' }}>
            Partie : {gameId}
          </h1>*/}
          <p><strong>Votre pseudo :</strong> {username}</p>
          <p><strong>Dernier domino posé par :</strong> {lastPlayer || 'Aucun'}</p>

          {passingPlayer && <p style={{ color: 'red' }}>{passingPlayer} a passé son tour.</p>}

          

          {/* affichage nombre dominos autres joeurs*/} 

          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
        {otherPlayers.map((player, index) => (
          <div key={player.username} style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ fontWeight: 'bold', color: '#FFF' }}>{player.username}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
            {Array.from({ length: player.handCount || 0 }).map((_, i) => (
                <img key={i} src={dominoBack} alt="Dos du domino" style={{ width: '10px', height: '20px' }} />
              ))}
            </div>
          </div>
        ))}
      </div>


          <Board
            players={players}
            dominos={dominos}
            playDomino={playDomino}
          />
              
      {/* 📩 Icône de message avec animation */}
      <img
        src={newMessageReceived ? iconeMessageNotif : iconeMessage}
        alt="Message"
        onClick={toggleChatbox}
        className={`message-icon ${newMessageReceived ? "shake" : ""}`} // ✅ Ajoute une classe dynamique
      />

          {/* Chatbox */}
          {isChatboxVisible && (
            <div className="chat-popup-overlay" onClick={toggleChatbox}>
            <div className="chat-popup" onClick={(e) => e.stopPropagation()}>
              <Chat gameId={gameId} username={username}  initialMessages={messages} />
            </div>
          </div>
          )}


     {/*<Chat gameId={gameId} username={username} />*/}
      {/*<VoiceChat gameId={gameId} username={username} />  Intégration ici */}
      <div style={{ marginTop: '20px', display: 'flex',    justifyContent: 'center',  gap: '50px' }}>
      <button onClick={passTurn}>TOCKER</button> {/*passer son tour */}
      <button onClick={leaveGame}>Quitter</button>
      </div>
        </div>
      )}
    </div>
  );
}

export default Game;

