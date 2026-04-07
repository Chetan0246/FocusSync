// Import React and ReactDOM for rendering the app
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Find the root div in index.html and render our App component
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
