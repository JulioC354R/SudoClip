import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './main.css';
import { setupShortcuts, destroyShortcuts } from './lib/shortcuts';

destroyShortcuts();
setupShortcuts();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
