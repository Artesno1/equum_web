import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { APIProvider } from '@vis.gl/react-google-maps';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <APIProvider apiKey="YOUR_API_KEY_HERE">
      <App />
    </APIProvider>
  </React.StrictMode>,
)
