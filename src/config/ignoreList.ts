export const IGNORED_SENDERS = [
  'comments-noreply@docs.google.com',
  'calendar-server.bounces.google.com',
  'noreply@google.com',
  'drive-shares-noreply@google.com',
  'meet-recordings-noreply@google.com',
  'calendar-notification@google.com',
  'notifications-noreply@google.com'
];

// Function to check if an email address is in the ignore list
export const isIgnoredSender = (emailAddress: string): boolean => {
  const normalizedEmail = emailAddress.toLowerCase().trim();
  return IGNORED_SENDERS.some(ignored => 
    normalizedEmail.includes(ignored.toLowerCase())
  );
};
