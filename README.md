# Gmail Auto-Responder

A React application that helps you manage your Gmail inbox with AI-powered auto-responses.

## Features

- Google OAuth integration for secure Gmail access
- View and manage your emails
- Archive emails with one click
- Modern, responsive UI with Material UI
- Dark theme support

## Prerequisites

Before you begin, ensure you have:
- Node.js installed (v14 or later)
- A Google Cloud Console project with Gmail API enabled
- OAuth 2.0 credentials configured

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd gmail-reply-autoresponder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
VITE_GMAIL_CLIENT_ID=your_client_id_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

4. Configure OAuth in Google Cloud Console:
   - Go to the Google Cloud Console
   - Enable the Gmail API
   - Configure the OAuth consent screen
   - Create OAuth 2.0 credentials
   - Add `http://localhost:3000` as an authorized JavaScript origin
   - Add `http://localhost:3000/callback` as an authorized redirect URI

5. Start the development server:
```bash
npm start
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Click "Sign in with Google" and authorize the application
3. View your emails in the dashboard
4. Use the archive button to move emails to trash

## Tech Stack

- React
- TypeScript
- Material UI
- Zustand (State Management)
- React Query
- React Router
- Gmail API

## Development

To run the development server:
```bash
npm start
```

To build for production:
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
