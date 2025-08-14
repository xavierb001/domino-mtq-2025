import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.PROD 
  ? 'https://hidden-meadow-68185-d2168c8f325d.herokuapp.com'
  : 'http://localhost:3000';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'], // Force WebSocket + fallback
  secure: true, // Important pour Heroku
  withCredentials: true
});

export default socket;

services:
  - type: web
    name: domino-frontend
    buildCommand: cd domino-frontend && npm install && npm run build
    staticPublishPath: ./domino-frontend/dist
    
  - type: web
    name: domino-backend
    buildCommand: cd domino-backend && npm install
    startCommand: cd domino-backend && npm