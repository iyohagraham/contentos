import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { seedIfEmpty } from './lib/db/seed.js'

// Seed demo data on first load (local mode only)
seedIfEmpty()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)// deploy trigger 1782097531
