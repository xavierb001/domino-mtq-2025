const ResultPopup = ({ roundResult, gameResult, username, startNewRound, onClose }) => {
    return (
      <div className="popup-overlay">
        <div className="popup-content">
          {roundResult && roundResult.winner !== "Aucun" && (
            <div style={{ color: 'blue' }}>
              <strong>Fin de la manche :</strong> {roundResult.winner} a gagné cette manche !
              <ul>
                {roundResult.scores.map((player) => (
                  <li key={player.username}>
                    {player.username}: {player.score} point(s)
                  </li>
                ))}
              </ul>
              {roundResult.winner === username && (
                <button onClick={startNewRound} className="popup-button">
                  Démarrer une nouvelle manche
                </button>
              )}
            </div>
          )}
  
          {roundResult && roundResult.winner === "Aucun" && ( 
            <div style={{ color: 'red' }}>
              <strong>Manche terminée :</strong> Aucun joueur ne pouvait poser de domino.
              <button onClick={startNewRound} className="popup-button">
                Démarrer une nouvelle manche
              </button>
            </div>
          )}
  
          {gameResult && (
            <div style={{ color: 'green' }}>
              <strong>Partie terminée :</strong> {gameResult.winner} a gagné la partie !
              <ul>
                {gameResult.scores.map((player) => (
                  <li key={player.username}>
                    {player.username}: {player.score} point(s)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };
  export default ResultPopup;