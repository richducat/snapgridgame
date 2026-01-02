import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

const notifyResume = () => {
  if (document.visibilityState === 'visible') {
    window.dispatchEvent(new Event('solana:resume'));
  }
};

window.addEventListener('focus', notifyResume);
window.addEventListener('visibilitychange', notifyResume);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
