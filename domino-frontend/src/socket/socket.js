import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.PROD 
  ? 'https://domino-martinique.onrender.com'
  : 'http://localhost:3000';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'], // Force WebSocket + fallback
  secure: true, // Important pour Heroku
  withCredentials: true
});

export default socket;

