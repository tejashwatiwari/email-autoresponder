import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Chip,
  CircularProgress,
  Button,
  Skeleton 
} from '@mui/material';
import { 
  Archive as ArchiveIcon, 
  Logout as LogoutIcon,
  Refresh as RefreshIcon 
} from '@mui/icons-material';
import { useAuthStore } from '../store/useAuthStore';
import { gmailApi } from '../services/gmailApi';
import { Email } from '../types/email';
import toast from 'react-hot-toast';
import { EmailProcessor } from '../services/emailProcessor';

const DEFAULT_LABELS_TO_HIDE = [
  'INBOX',
  'UNREAD',
  'IMPORTANT',
  'CATEGORY_PERSONAL',
  'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
  'SENT',
  'DRAFT',
  'SPAM',
  'TRASH',
  'STARRED'
];

const EmailDashboard: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const { logout } = useAuthStore();
  const emailProcessor = EmailProcessor.getInstance();

  const fetchEmails = async (showRefreshingState = false, pageToken?: string) => {
    try {
      if (showRefreshingState) {
        if (pageToken) {
          setIsLoadingMore(true);
        } else {
          toast.loading('Refreshing emails...');
        }
      }
      if (!pageToken) {
        setIsLoading(true);
        setError(null);
      }
      
      const response = await gmailApi.getEmails(pageToken);
      
      if (pageToken) {
        setEmails(prevEmails => [...prevEmails, ...response.emails]);
      } else {
        setEmails(response.emails);
      }
      
      setNextPageToken(response.nextPageToken);
      setHasMoreEmails(!!response.nextPageToken);
      
      if (showRefreshingState && !pageToken) {
        toast.success('Emails refreshed successfully');
      }
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      setError(error.message || 'Failed to fetch emails');
      toast.error('Failed to fetch emails');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      if (showRefreshingState) {
        setIsRefreshing(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchEmails(true, nextPageToken);
    }
  };

  const processEmails = async () => {
    try {
      const result = await emailProcessor.processNewEmails();
      return result;
    } catch (error) {
      console.error('Error processing emails:', error);
      throw error;
    }
  };

  const handleProcessEmails = async (resetPagination: boolean = false) => {
    try {
      if (resetPagination) {
        emailProcessor.resetPagination();
      }
      setIsProcessing(true);
      const result = await processEmails();
      setHasMoreEmails(result.hasMore);
      if (result.processedCount > 0) {
        toast.success(`Processed ${result.processedCount} emails`);
      } else {
        toast('No new emails to process');
      }
      await fetchEmails();
    } catch (error) {
      console.error('Error processing emails:', error);
      toast.error('Error processing emails');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopProcessing = () => {
    emailProcessor.stopProcessing();
    toast.success('Stopping email processing...');
  };

  const handleRefreshEmails = async () => {
    setIsRefreshing(true);
    await fetchEmails(true);
  };

  const handleArchive = async (email: Email) => {
    try {
      await gmailApi.deleteEmail(email.id);
      setEmails(prevEmails => prevEmails.filter(e => e.id !== email.id));
      toast.success('Email archived successfully');
    } catch (error) {
      console.error('Error archiving email:', error);
      toast.error('Failed to archive email');
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Error
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            {error}
          </Typography>
          <Button
            onClick={() => fetchEmails()}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box 
        sx={{ 
          my: 4,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          bgcolor: 'background.default',
          pb: 2
        }}
      >
        {/* Header Section */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 3,
            mb: 4,
            background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
            borderRadius: 3,
            p: 4,
            color: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 600,
                letterSpacing: '-0.5px',
                fontSize: { xs: '1.75rem', sm: '2.5rem' },
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              Gmail Auto-Responder
            </Typography>
            <IconButton 
              onClick={logout} 
              sx={{ 
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }
              }} 
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexWrap: 'wrap',
            '& .MuiButton-root': {
              borderRadius: 2,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              minWidth: '160px',
              transition: 'all 0.2s',
              fontWeight: 500,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }
            }
          }}>
            <Button
              onClick={() => handleProcessEmails(true)}
              disabled={isProcessing}
              variant="contained"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                color: '#1a237e',
                '&:hover': {
                  bgcolor: 'white',
                }
              }}
              startIcon={isProcessing ? <CircularProgress size={20} /> : null}
            >
              {isProcessing ? 'Processing...' : 'Process New Batch'}
            </Button>
            {hasMoreEmails && (
              <Button
                onClick={() => handleProcessEmails(false)}
                disabled={isProcessing}
                variant="contained"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  color: '#1a237e',
                  '&:hover': {
                    bgcolor: 'white',
                  }
                }}
              >
                Process Next Batch
              </Button>
            )}
            <Button
              onClick={handleRefreshEmails}
              disabled={isRefreshing}
              variant="outlined"
              sx={{ 
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
              startIcon={isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Emails'}
            </Button>
            {isProcessing && (
              <Button
                onClick={handleStopProcessing}
                variant="contained"
                sx={{
                  bgcolor: '#ef5350',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#d32f2f',
                  }
                }}
              >
                Stop Processing
              </Button>
            )}
          </Box>
        </Box>

        {isLoading ? (
          <Box sx={{ my: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary" gutterBottom>
              Loading emails...
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ width: '100%' }}>
              {emails.map((email) => (
                <ListItem
                  key={email.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 2,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    p: 2,
                    bgcolor: 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.01)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <ListItemText
                      primary={email.subject}
                      secondary={`From: ${email.from}`}
                      sx={{ mr: 2 }}
                    />
                    <IconButton
                      onClick={() => handleArchive(email)}
                      size="small"
                      sx={{ 
                        alignSelf: 'flex-start',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <ArchiveIcon />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {email.labelNames
                      .filter(label => !DEFAULT_LABELS_TO_HIDE.includes(label.toUpperCase()))
                      .map((label, index) => (
                        <Chip
                          key={index}
                          label={label}
                          size="small"
                          sx={{
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                          }}
                        />
                      ))}
                  </Box>
                  
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.5
                    }}
                  >
                    {email.snippet}
                  </Typography>
                </ListItem>
              ))}
            </List>
            
            {hasMoreEmails && (
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outlined"
                  sx={{
                    minWidth: '200px',
                    textTransform: 'none',
                    borderRadius: 2,
                    py: 1,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: 1
                    }
                  }}
                >
                  {isLoadingMore ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading...
                    </>
                  ) : (
                    'Load More Emails'
                  )}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default EmailDashboard;