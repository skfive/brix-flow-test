import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('kanban-board-root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
