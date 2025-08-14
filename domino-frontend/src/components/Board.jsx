import React, { useState, useEffect } from 'react';
import socket from '../socket/socket'; // Import de l'instance Socket.IO
import plateauDeJeu from '../assets/images/plateau_de_jeu.jpg'; // Import de l'image du plateau
const plateauDeJeuURL = "https://res.cloudinary.com/dwvfz8o89/image/upload/v1738618686/domino/ikv3ssgvaydiwoblyuxl.jpg";



// Import des images de dominos
import domino_0_0 from '../assets/images/dominos/domino_0_0.png';
import domino_0_1 from '../assets/images/dominos/domino_0_1.png';
import domino_0_2 from '../assets/images/dominos/domino_0_2.png';
import domino_0_3 from '../assets/images/dominos/domino_0_3.png';
import domino_0_4 from '../assets/images/dominos/domino_0_4.png';
import domino_0_5 from '../assets/images/dominos/domino_0_5.png';
import domino_0_6 from '../assets/images/dominos/domino_0_6.png';
import domino_1_1 from '../assets/images/dominos/domino_1_1.png';
import domino_1_2 from '../assets/images/dominos/domino_1_2.png';
import domino_1_3 from '../assets/images/dominos/domino_1_3.png';
import domino_1_4 from '../assets/images/dominos/domino_1_4.png';
import domino_1_5 from '../assets/images/dominos/domino_1_5.png';
import domino_1_6 from '../assets/images/dominos/domino_1_6.png';
import domino_2_2 from '../assets/images/dominos/domino_2_2.png';
import domino_2_3 from '../assets/images/dominos/domino_2_3.png';
import domino_2_4 from '../assets/images/dominos/domino_2_4.png';
import domino_2_5 from '../assets/images/dominos/domino_2_5.png';
import domino_2_6 from '../assets/images/dominos/domino_2_6.png';
import domino_3_3 from '../assets/images/dominos/domino_3_3.png';
import domino_3_4 from '../assets/images/dominos/domino_3_4.png';
import domino_3_5 from '../assets/images/dominos/domino_3_5.png';
import domino_3_6 from '../assets/images/dominos/domino_3_6.png';
import domino_4_4 from '../assets/images/dominos/domino_4_4.png';
import domino_4_5 from '../assets/images/dominos/domino_4_5.png';
import domino_4_6 from '../assets/images/dominos/domino_4_6.png';
import domino_5_5 from '../assets/images/dominos/domino_5_5.png';
import domino_5_6 from '../assets/images/dominos/domino_5_6.png';
import domino_6_6 from '../assets/images/dominos/domino_6_6.png';

// Mapping des images de dominos
const dominoImages = {
  '0_0': domino_0_0,
  '0_1': domino_0_1,
  '0_2': domino_0_2,
  '0_3': domino_0_3,
  '0_4': domino_0_4,
  '0_5': domino_0_5,
  '0_6': domino_0_6,
  '1_1': domino_1_1,
  '1_2': domino_1_2,
  '1_3': domino_1_3,
  '1_4': domino_1_4,
  '1_5': domino_1_5,
  '1_6': domino_1_6,
  '2_2': domino_2_2,
  '2_3': domino_2_3,
  '2_4': domino_2_4,
  '2_5': domino_2_5,
  '2_6': domino_2_6,
  '3_3': domino_3_3,
  '3_4': domino_3_4,
  '3_5': domino_3_5,
  '3_6': domino_3_6,
  '4_4': domino_4_4,
  '4_5': domino_4_5,
  '4_6': domino_4_6,
  '5_5': domino_5_5,
  '5_6': domino_5_6,
  '6_6': domino_6_6,
};

// Fonction pour obtenir l'image d'un domino
const getDominoImage = (domino) => {
  const [left, right] = domino;
  const key = `${left}_${right}`;
  const reversedKey = `${right}_${left}`; // Vérification des valeurs inversées
  return dominoImages[key] || dominoImages[reversedKey];
};


const Board = ({ players, gameId, username, dominos, playDomino }) => {
  const [playerHand, setPlayerHand] = useState([]);
  const [selectedDomino, setSelectedDomino] = useState(null);
  const [showSideChoice, setShowSideChoice] = useState(false);
  const [positionOffset, setPositionOffset] = useState(0); // Stocke le décalage dynamique
  useEffect(() => {
    socket.on('updateHand', (hand) => {
      console.log('[Socket.IO] Main mise à jour :', hand);
      setPlayerHand(hand);
    });

    return () => {
      socket.off('updateHand');
    };
  }, []);

  useEffect(() => {
    if (dominos.length > 0) {
      // Vérifie si le dernier domino a été ajouté à gauche ou à droite
      const lastMove = dominos[dominos.length - 1].move; // 'left' ou 'right'
      
      setPositionOffset((prevOffset) => 
        lastMove === 'left' ? prevOffset + 50 : prevOffset - 50
      );
    }
  }, [dominos]);

  const isDominoPlayable = (domino) => {
    if (dominos.length === 0) return true;
    const left = dominos[0][0];
    const right = dominos[dominos.length - 1][1];
    return domino[0] === left || domino[1] === left || domino[0] === right || domino[1] === right;
  };
  const handleSideChoice = (side) => {
    if (selectedDomino) {
      playDomino(selectedDomino, side);
      removeDominoFromHand(selectedDomino);
      setSelectedDomino(null);
      setShowSideChoice(false);
    }
  };
  const handleDominoClick = (domino) => {
    if (selectedDomino && selectedDomino !== domino) {
      setShowSideChoice(false);
    }
    if (dominos.length === 0) {
      playDomino(domino, 'right');
      removeDominoFromHand(domino);
    } else {
      const left = dominos[0][0];
      const right = dominos[dominos.length - 1][1];
      const canPlayLeft = domino[0] === left || domino[1] === left;
      const canPlayRight = domino[0] === right || domino[1] === right;

      if (canPlayLeft && canPlayRight) {
        setSelectedDomino(domino);
        setShowSideChoice(true);
      } else if (canPlayLeft) {
        playDomino(domino, 'left');
        removeDominoFromHand(domino);
      } else if (canPlayRight) {
        playDomino(domino, 'right');
        removeDominoFromHand(domino);
      }
    }
  };

  const removeDominoFromHand = (domino) => {
    setPlayerHand((prevHand) => prevHand.filter((d) => !(d[0] === domino[0] && d[1] === domino[1])));
  };

  const getDominoStyle = (domino, isPlayerHand = false) => {
    const [left, right] = domino;
    const isDouble = left === right;
    const isReversed = left > right; // Vérifie si le domino est inversé

    return {
      width: '60px',
      height: '30px',
      //border: '1px solid black',
      //borderRadius: '5px',
      transform: isPlayerHand
      ? 'rotate(90deg)'
      : isDouble
      ? 'rotate(90deg)'
      : isReversed
      ? 'rotate(180deg)'
      : 'none',
      //margin: isDouble ? '-100px 2px' : '2px',// Ajuste l'espacement pour les doubles
  
    };
  };  

  // 🎯 Exclure le joueur actif de l'affichage
 // const otherPlayers = players.filter((player) => player.username !== username);


  return (

    <div style={{ textAlign: 'center', padding: '20px' }}>


<div
      style={{
        padding: '0px 50px 0px 50px',
        width: '50%',
        height: '20vh',
        maxWidth: '80vw',          // Évite qu'il prenne toute la largeur
        margin: 'auto', 
        textAlign: 'center',
        marginTop: '20px',
        marginBottom: '25px',
        backgroundImage: `url(${plateauDeJeuURL})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '10vh',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        border: '8px solid #4a1f01',
        borderRadius: '15px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
        overflow: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{
        display: 'flex',
        //flexDirection: 'column',
        //alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        padding: '20px'
      }}>
        {dominos.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#FFF' }}>Aucun domino n'a encore été posé.</p>
        ) : (
          <div style={{ display: 'flex', gap: '1px', padding: '0 10px', // Ajoute des marges pour le scroll
            minWidth: 'max-content', // Assure que tout le contenu est accessible
            transform: 'translateX(${positionOffset}%)', // Centre les dominos même s'ils s'ajoutent
            left: '10%',
            position: 'absolute',
          }}>
            {dominos.map((domino, index) => (
              <img
                key={index}
                src={getDominoImage(domino)}
                alt={`Domino ${domino[0]}|${domino[1]}`}
                style={getDominoStyle(domino)}
              />
            ))}
          </div>
        )}
      </div> 
      </div>
      <div>
      
        <div style={{ display: 'flex', marginBottom: '20px',       alignItems: 'center',
      justifyContent: 'center', }}>
          {playerHand.map((domino, index) => (
            <img
              key={`${domino[0]}-${domino[1]}-${index}`}
              src={getDominoImage(domino)}
              alt={`Domino ${domino[0]}|${domino[1]}`}
              onClick={() => handleDominoClick(domino)}
              style={{
                ...getDominoStyle(domino, true), // Utilisation de "true" pour la main du joueur
                cursor: isDominoPlayable(domino) ? 'pointer' : 'not-allowed',
                opacity: isDominoPlayable(domino) ? 1 : 0.5,
                //border: isDominoPlayable(domino) ? '2px solid green' : '2px solid red',
                marginLeft: index !== 0 ? '-25px' : '0px', // Rapprochement des dominos
      
              }}
            />
          ))}
        </div>
      </div>
      {showSideChoice && (
        <div style={{ marginTop: '20px' }}>
          <p>Choisissez où jouer :</p>
          <button onClick={() => handleSideChoice('left')} style={{ marginRight: '10px' }}>
            Gauche
          </button>
          <button onClick={() => handleSideChoice('right')}>Droite</button>
        </div>
      )}
    </div>
  );
};

export default Board;