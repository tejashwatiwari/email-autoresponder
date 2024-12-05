// Gmail API Configuration
export const GMAIL_CONFIG = {
    CLIENT_ID: process.env.REACT_APP_GMAIL_CLIENT_ID as string,
    REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/callback',
    SCOPES: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.labels'
    ].join(' '),
    DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest']
} as const;

// Email Labels Configuration
export const EMAIL_LABELS = {
    APPRECIATION: 'Appreciation',
    FEATURE_REQUEST: 'Feature Request',
    SUPPORT: 'Support',
    PRICING: 'Pricing'
} as const;

// Type for Email Labels
export type EmailLabel = typeof EMAIL_LABELS[keyof typeof EMAIL_LABELS];

// API Response Types
export interface GmailApiResponse<T> {
    data: T;
    status: number;
    statusText: string;
}

// Email Types
export interface EmailMetadata {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload?: {
        headers: {
            name: string;
            value: string;
        }[];
        body?: {
            data?: string;
        };
        parts?: {
            body: {
                data?: string;
            };
        }[];
    };
}

// Environment Variables Type Check
const requiredEnvVars = ['REACT_APP_GMAIL_CLIENT_ID'] as const;
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});
