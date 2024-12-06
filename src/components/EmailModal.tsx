import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Email } from '../types/email';
import { gmailApi } from '../services/gmailApi';

interface EmailModalProps {
  email: Email | null;
  open: boolean;
  onClose: () => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ email, open, onClose }) => {
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchThread = async () => {
      if (email?.threadId) {
        setLoading(true);
        try {
          const thread = await gmailApi.getFullThread(email.threadId);
          const sortedThread = [...thread].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setThreadEmails(sortedThread);
        } catch (error) {
          console.error('Error fetching thread:', error);
        }
        setLoading(false);
      }
    };

    if (open && email) {
      fetchThread();
    }
  }, [email, open]);

  if (!email) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          m: 2
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, flexShrink: 0 }}>
        <Typography variant="h6" component="div">
          {email.subject}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ 
        pt: 2, 
        flexGrow: 1, 
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {threadEmails.map((threadEmail, index) => (
              <Box 
                key={threadEmail.id} 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '100%'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mb: 1,
                  flexWrap: 'wrap',
                  gap: 1
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {threadEmail.from}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(threadEmail.date).toLocaleString()}
                  </Typography>
                </Box>

                {index === 0 && threadEmail.labelNames && threadEmail.labelNames.length > 0 && (
                  <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {threadEmail.labelNames
                      .filter((label: string) => !['INBOX', 'SENT', 'IMPORTANT', 'CATEGORY_PERSONAL'].includes(label.toUpperCase()))
                      .map((label: string, i: number) => (
                        <Chip
                          key={i}
                          label={label}
                          size="small"
                          sx={{
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                          }}
                        />
                      ))}
                  </Box>
                )}
                
                <Typography 
                  variant="body1" 
                  component="div" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    backgroundColor: 'background.paper',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    width: '100%',
                    wordBreak: 'break-word'
                  }}
                >
                  {threadEmail.body || threadEmail.snippet}
                </Typography>

                {index < threadEmails.length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ flexShrink: 0 }}>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailModal;
