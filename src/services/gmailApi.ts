import axios from 'axios';
import { Email } from '../types/email';
import toast from 'react-hot-toast';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Rate limiting configuration
const REQUESTS_PER_SECOND = 2;
const RETRY_DELAY = 1000; // 1 second delay between retries
const MAX_RETRIES = 3;

// Cache for label IDs to avoid repeated API calls
const labelCache = new Map<string, string>();

// Rate limiting implementation
class RateLimiter {
    private lastRequestTime: number = 0;
    private requestQueue: Array<() => Promise<any>> = [];
    private processing: boolean = false;

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async processQueue() {
        if (this.processing || this.requestQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.requestQueue.length > 0) {
            const currentTime = Date.now();
            const timeSinceLastRequest = currentTime - this.lastRequestTime;
            const timeToWait = Math.max(0, (1000 / REQUESTS_PER_SECOND) - timeSinceLastRequest);
            
            if (timeToWait > 0) {
                await this.delay(timeToWait);
            }
            
            const request = this.requestQueue.shift();
            if (request) {
                this.lastRequestTime = Date.now();
                try {
                    await request();
                } catch (error) {
                    console.error('Request failed:', error);
                }
            }
        }
        
        this.processing = false;
    }

    async addToQueue<T>(request: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }
}

const rateLimiter = new RateLimiter();

// Wrapper for axios requests with retry logic
async function makeRequest(config: any): Promise<any> {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            return await rateLimiter.addToQueue(() => axios(config));
        } catch (error: any) {
            if (error.response?.status === 429) {
                retries++;
                if (retries < MAX_RETRIES) {
                    console.log(`Rate limit hit, retrying in ${RETRY_DELAY}ms... (Attempt ${retries + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
                    continue;
                }
            }
            throw error;
        }
    }
}

export const gmailApi = {
    async getLabels(): Promise<any[]> {
        try {
            const response = await makeRequest({
                method: 'get',
                url: `${GMAIL_API_BASE}/labels`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                },
            });
            
            // Cache the labels using display name if available
            response.data.labels.forEach((label: any) => {
                labelCache.set(label.id, label.name || label.id);
            });
            
            return response.data.labels;
        } catch (error) {
            console.error('Failed to fetch labels:', error);
            throw error;
        }
    },

    getLabelName(labelId: string): string {
        return labelCache.get(labelId) || labelId;
    },

    async getEmails(pageToken?: string): Promise<{
        emails: Array<{
            id: string;
            threadId: string;
            snippet: string;
            subject: string;
            from: string;
            date: string;
            labels: string[];
            labelNames: string[];
            body: string;
            inReplyTo?: string;
            references?: string;
        }>;
        nextPageToken?: string;
    }> {
        try {
            // Ensure labels are cached
            if (labelCache.size === 0) {
                await this.getLabels();
            }

            const params = new URLSearchParams({
                maxResults: '50',
                ...(pageToken && { pageToken }),
            });

            const response = await makeRequest({
                method: 'get',
                url: `${GMAIL_API_BASE}/messages?${params.toString()}`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                },
            });

            const emails = await Promise.all(
                response.data.messages.map(async (message: any) => {
                    try {
                        const details = await makeRequest({
                            method: 'get',
                            url: `${GMAIL_API_BASE}/messages/${message.id}`,
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                            },
                        });

                        const headers = details.data.payload.headers;
                        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
                        const from = headers.find((h: any) => h.name === 'From')?.value || '';
                        const date = headers.find((h: any) => h.name === 'Date')?.value || '';

                        // Get email body
                        let body = '';
                        if (details.data.payload.body?.data) {
                            body = atob(details.data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                        } else if (details.data.payload.parts) {
                            const textPart = details.data.payload.parts.find((part: any) => part.mimeType === 'text/plain');
                            if (textPart?.body?.data) {
                                body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                            }
                        }

                        // Use cached label names
                        const labelNames = details.data.labelIds.map((labelId: string) => this.getLabelName(labelId));

                        return {
                            id: message.id,
                            threadId: message.threadId,
                            subject,
                            from,
                            date,
                            snippet: details.data.snippet,
                            body,
                            labels: details.data.labelIds || [],
                            labelNames,
                        };
                    } catch (error) {
                        console.error(`Error fetching email ${message.id}:`, error);
                        throw error;
                    }
                })
            );

            return {
                emails,
                nextPageToken: response.data.nextPageToken,
            };
        } catch (error) {
            console.error('Failed to fetch emails:', error);
            throw error;
        }
    },

    async getFullThread(threadId: string): Promise<Email[]> {
        try {
            // First get all labels to create a mapping
            const labelsResponse = await makeRequest({
                method: 'get',
                url: `${GMAIL_API_BASE}/labels`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                },
            });
            
            const labelMap = new Map(
                labelsResponse.data.labels.map((label: any) => [label.id, label.name])
            );

            const response = await makeRequest({
                method: 'get',
                url: `${GMAIL_API_BASE}/threads/${threadId}`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                },
                params: {
                    format: 'full'
                }
            });

            const thread = response.data;
            const emails: Email[] = thread.messages.map((message: any) => {
                const headers = message.payload.headers;
                const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
                const from = headers.find((h: any) => h.name === 'From')?.value || '';
                const date = headers.find((h: any) => h.name === 'Date')?.value || '';
                
                // Get email body
                let body = '';
                if (message.payload.parts) {
                    const textPart = message.payload.parts.find(
                        (part: any) => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
                    );
                    if (textPart && textPart.body.data) {
                        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                } else if (message.payload.body.data) {
                    body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }

                // Convert label IDs to names
                const labelNames = (message.labelIds || [])
                    .map((id: string) => labelMap.get(id))
                    .filter((name: string | undefined): name is string => name !== undefined);

                return {
                    id: message.id,
                    threadId: message.threadId,
                    snippet: message.snippet,
                    body,
                    labelIds: message.labelIds || [],
                    historyId: message.historyId,
                    internalDate: message.internalDate,
                    labels: message.labelIds || [],
                    labelNames,
                    from,
                    subject,
                    date,
                    sizeEstimate: message.sizeEstimate
                };
            });

            return emails;
        } catch (error) {
            console.error('Error fetching thread:', error);
            throw error;
        }
    },

    async deleteEmail(emailId: string): Promise<void> {
        try {
            await makeRequest({
                method: 'post',
                url: `${GMAIL_API_BASE}/messages/${emailId}/trash`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                },
            });
        } catch (error) {
            console.error('Failed to delete email:', error);
            throw error;
        }
    },

    async createLabel(labelName: string): Promise<string> {
        try {
            // First, check if label already exists
            const existingLabel = await this.findLabelByName(labelName);
            if (existingLabel) {
                return existingLabel.id;
            }

            // Log the request data for debugging
            console.log('Creating label with data:', {
                name: labelName,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            });

            const response = await makeRequest({
                method: 'post',
                url: `${GMAIL_API_BASE}/labels`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                },
            });

            const newLabel = response.data;
            labelCache.set(newLabel.id, newLabel.name);
            return newLabel.id;
        } catch (error: any) {
            console.error('Failed to create label:', error);
            // Log the error response for debugging
            if (error.response) {
                console.error('Error response:', {
                    data: error.response.data,
                    status: error.response.status,
                    headers: error.response.headers
                });
            }
            throw error;
        }
    },

    async findLabelByName(labelName: string): Promise<any | undefined> {
        const labels = await this.getLabels();
        return labels.find(label => label.name === labelName);
    },

    async addLabel(emailId: string, labelName: string): Promise<void> {
        try {
            // First ensure the label exists
            const labelId = await this.createLabel(labelName);
            
            // Log the modify request for debugging
            console.log('Adding label to email:', {
                emailId,
                labelName,
                labelId
            });

            await makeRequest({
                method: 'post',
                url: `${GMAIL_API_BASE}/messages/${emailId}/modify`,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('gmail_token')}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    addLabelIds: [labelId],
                },
            });
        } catch (error) {
            console.error('Failed to add label:', error);
            throw error;
        }
    },
};
