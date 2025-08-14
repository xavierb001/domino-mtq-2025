import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket/socket';

function Chat({ gameId, username, initialMessages = [] }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(initialMessages); // Utilise les messages initiaux
  const messagesEndRef = useRef(null); // Référence pour le défilement automatique

  useEffect(() => {
    // Fonction pour gérer les messages reçus
    const handleReceiveMessage = ({ username: sender, message: receivedMessage }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: `${sender}-${Date.now()}`, username: sender, message: receivedMessage },
      ]);
    };

    // Écouter les messages du serveur
    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage); // Nettoyer l'écouteur
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();

    if (message.trim()) {
      // Ajouter le message localement
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: `local-${Date.now()}`, username, message },
      ]);

      // Envoyer le message au serveur
      socket.emit('sendMessage', { gameId, username, message });

      setMessage(''); // Réinitialiser le champ de message
    }
  };

  // Défilement automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px', maxWidth: '400px' }}>
      <h3>Chat</h3>
      <div
        style={{
          maxHeight: '150px',
          overflowY: 'auto',
          marginBottom: '10px',
          backgroundColor: '#f9f9f9',
          padding: '5px',
          border: '1px solid #ddd',
        }}
      >
        {messages.length > 0 ? (
          messages.map((msg) => (
            <p key={msg.id} style={{ margin: '5px 0' }}>
              <strong>{msg.username}:</strong> {msg.message}
            </p>
          ))
        ) : (
          <p style={{ fontStyle: 'italic', color: '#888' }}>Aucun message pour le moment.</p>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tapez votre message"
          style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          style={{ padding: '5px 10px', borderRadius: '4px', background: '#007bff', color: '#fff', border: 'none' }}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}

export default Chat;