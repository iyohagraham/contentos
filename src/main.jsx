import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { seedIfEmpty } from './lib/db/seed.js'

// Seed demo data on first load (local mode only)
// Wrapped in try-catch to prevent blank page if seeding fails
seedIfEmpty().catch(err => console.error('Seed failed:', err))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
