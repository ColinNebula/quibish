import React from 'react';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const AppWithProviders = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWithProviders;
