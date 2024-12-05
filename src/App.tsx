import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import EmailDashboard from './components/EmailDashboard';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './components/LoginPage';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication status when the app loads
    const token = localStorage.getItem('gmail_token');
    if (token) {
      checkAuth();
    }
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <EmailDashboard />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginPage />
                )
              }
            />
            <Route 
              path="/callback" 
              element={<LoginPage />} 
            />
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }} 
          />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
