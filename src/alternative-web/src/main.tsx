// @@filename: src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './app-styles.css'

import { PropertyProvider } from './context/PropertyContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PropertyProvider>
            <App />
        </PropertyProvider>
    </React.StrictMode>,
)
