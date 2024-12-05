import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Typography, Paper, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/useAuthStore';
import { GMAIL_CONFIG } from '../config';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const { setAuth, isAuthenticated, checkAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're already authenticated
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    try {
      setIsLoading(true);
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('oauth_state', state);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GMAIL_CONFIG.CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(GMAIL_CONFIG.REDIRECT_URI)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(GMAIL_CONFIG.SCOPES)}` +
        `&prompt=consent` +
        `&state=${state}` +
        `&include_granted_scopes=true`;
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to initiate Google login. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      if (location.hash) {
        const params = new URLSearchParams(location.hash.substring(1));
        const accessToken = params.get('access_token');
        const error = params.get('error');
        const state = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state');

        // Clear stored state
        sessionStorage.removeItem('oauth_state');

        if (state !== storedState) {
          console.error('OAuth state mismatch');
          toast.error('Security validation failed. Please try again.');
          setIsLoading(false);
          return;
        }

        if (error) {
          console.error('OAuth error:', error);
          toast.error('Authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }

        if (accessToken) {
          try {
            // Store token and update auth state
            localStorage.setItem('gmail_token', accessToken);
            await Promise.resolve(setAuth(true, { access_token: accessToken }));
            
            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname);
            
            // Verify auth state is updated
            checkAuth();
            
            toast.success('Successfully logged in!');
            navigate('/', { replace: true });
          } catch (error) {
            console.error('Token storage error:', error);
            toast.error('Failed to store authentication. Please try again.');
            localStorage.removeItem('gmail_token');
            setAuth(false, null);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    handleCallback();
  }, [location.hash, setAuth, navigate, checkAuth]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Gmail Auto-responder
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Generate AI-powered responses to your emails
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGoogleLogin}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            disabled={isLoading}
            sx={{
              mt: 3,
              textTransform: 'none',
              px: 4,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
