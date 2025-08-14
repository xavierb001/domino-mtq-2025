import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Home.css";
import backgroundImage from '../assets/images/imagefond_accueil.png';



function Home() {
  const [gameId, setGameId] = useState(''); // Stocke l'ID de la partie entrée par l'utilisateur
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);


  // Fonction pour créer une nouvelle partie
  const createGame = () => {
    const newGameId = Math.random().toString(36).substring(7); // Génère un ID unique
    navigate(`/game/${newGameId}`); // Redirige vers la page de la nouvelle partie
  };

  // Fonction pour rejoindre une partie existante
  const joinGame = () => {
    if (gameId.trim()) {
      navigate(`/game/${gameId}`); // Redirige vers la page de la partie
    } else {
      alert('Veuillez entrer un ID de partie valide.');
    }
  };

  const toggleRulesPopup = () => {
    setShowRules(!showRules);
  };

  return (
    <div
  style={{
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
  }}
>
    <div className="home-container">
      <div className="content">
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Bienvenue sur Domino F.W.I </h1>
      <div style={{ margin: '20px' }}>
        <button onClick={createGame} style={{ padding: '10px 20px', marginBottom: '20px' }}>
          Créer une Nouvelle Partie
        </button>
      </div>
      <div>
  <h3>Rejoindre une Partie</h3>
  <input
    type="text"
    placeholder="Entrez un ID de partie"
    value={gameId}
    onChange={(e) => setGameId(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        joinGame();
      }
    }}
    style={{
      padding: '10px',
      fontSize: '16px', // Empêche le zoom automatique
      width: '200px',
      marginRight: '10px',
      borderRadius: '5px',
      border: '1px solid #ccc',
    }}
  />
  <button onClick={joinGame} style={{ padding: '10px 20px' }}>
    Rejoindre
  </button>
   {/* Bouton d'information */}
   <img
        src="https://res.cloudinary.com/dwvfz8o89/image/upload/f_auto,q_auto/v1/domino/cpengjxws12jdjvxsk5m"
        alt="Règles du jeu"
        onClick={toggleRulesPopup}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "40px",
          height: "40px",
          cursor: "pointer",
        }}
      />
  {/* Popup des règles */}
  {showRules && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            width: "90%",
            maxWidth: "400px",
            zIndex: 1000,
          }}
        >
          <h2 style={{ color: "#333", textAlign: "center" }}>📜 Règles du Jeu</h2>
            <p style={{ color: "#000", lineHeight: "1.5" }}>
              🎲 <strong>Nombre de joueurs :</strong> 3 joueurs<br />
              🃏 <strong>Distribution :</strong> Chaque joueur reçoit 7 dominos.<br />
              ➡️ <strong>Déroulement :</strong> Les joueurs posent un domino correspondant à une extrémité du plateau.<br />
              🚫 <strong>Tour passé :</strong> Si un joueur ne peut pas jouer, il passe son tour.<br />
              🏆 <strong>Victoire :</strong> Le premier joueur à ne plus avoir de dominos gagne la manche !<br />
              ❌ <strong>Partie bloquée :</strong> Si personne ne peut jouer, la manche est annulée.<br />
            </p>

          <button
            onClick={toggleRulesPopup}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      )}
  
  </div>
    </div>
    </div>
    </div>
    </div>
  );
}

export default Home;