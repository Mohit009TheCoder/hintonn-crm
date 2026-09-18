import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './shared/Toast';
import { CRMProvider } from './context/CRMContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CRMProvider>
          <App />
        </CRMProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
