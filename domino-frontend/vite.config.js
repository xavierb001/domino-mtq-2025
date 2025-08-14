import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      //changeOrigin: true,
      //secure: false,
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }, 
   preview: {
    allowedHosts: ['hidden-meadow-68185-d2168c8f325d.herokuapp.com']
  }
});