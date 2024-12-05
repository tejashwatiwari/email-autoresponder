import { EMAIL_LABELS } from '../config';

export class GmailService {
    private static instance: GmailService;
    private gmail: any;

    private constructor() {
        this.gmail = (window as any).gapi?.client?.gmail?.users;
    }

    public static getInstance(): GmailService {
        if (!GmailService.instance) {
            GmailService.instance = new GmailService();
        }
        return GmailService.instance;
    }

    private async getLabelNames(): Promise<Record<string, string>> {
        try {
            const response = await this.gmail.labels.list({
                userId: 'me'
            });
            
            const labelMap: Record<string, string> = {};
            response.result.labels.forEach((label: any) => {
                labelMap[label.id] = label.name;
            });
            return labelMap;
        } catch (error) {
            console.error('Error fetching label names:', error);
            return {};
        }
    }

    async listEmails(maxResults = 50): Promise<any[]> {
        try {
            const labelMap = await this.getLabelNames();
            const response = await this.gmail.messages.list({
                userId: 'me',
                maxResults,
            });

            const emails = await Promise.all(
                response.result.messages.map(async (message: any) => {
                    const fullMessage = await this.gmail.messages.get({
                        userId: 'me',
                        id: message.id,
                    });

                    const headers = fullMessage.result.payload.headers;
                    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
                    const from = headers.find((h: any) => h.name === 'From')?.value || '';
                    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

                    const labelIds = fullMessage.result.labelIds || [];
                    const labelNames = labelIds.map((id: string) => labelMap[id] || id);

                    return {
                        id: message.id,
                        threadId: message.threadId,
                        snippet: fullMessage.result.snippet,
                        subject,
                        from,
                        date,
                        labels: labelIds,
                        labelNames: labelNames,
                        body: this.getEmailBody(fullMessage.result),
                    };
                })
            );

            return emails;
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    }

    private getEmailBody(message: any): string {
        const parts = message.payload.parts || [message.payload];
        let body = '';

        for (const part of parts) {
            if (part.mimeType === 'text/plain') {
                body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                break;
            }
        }

        return body;
    }

    async createLabel(name: string): Promise<string> {
        try {
            const response = await this.gmail.labels.create({
                userId: 'me',
                requestBody: {
                    name,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                },
            });
            return response.result.id;
        } catch (error) {
            console.error('Error creating label:', error);
            throw error;
        }
    }

    async addLabel(messageId: string, labelId: string): Promise<void> {
        try {
            await this.gmail.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    addLabelIds: [labelId],
                },
            });
        } catch (error) {
            console.error('Error adding label:', error);
            throw error;
        }
    }

    async createDraft(draft: any): Promise<void> {
        try {
            const message = [
                'Content-Type: text/plain; charset="UTF-8"\n',
                'MIME-Version: 1.0\n',
                'Content-Transfer-Encoding: 7bit\n',
                'to: ', draft.to, '\n',
                'subject: ', draft.subject, '\n\n',
                draft.body
            ].join('');

            await this.gmail.drafts.create({
                userId: 'me',
                requestBody: {
                    message: {
                        raw: btoa(message).replace(/\+/g, '-').replace(/\//g, '_'),
                        threadId: draft.threadId,
                    },
                },
            });
        } catch (error) {
            console.error('Error creating draft:', error);
            throw error;
        }
    }

    async archiveEmail(messageId: string): Promise<void> {
        try {
            await this.gmail.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: ['INBOX'],
                },
            });
        } catch (error) {
            console.error('Error archiving email:', error);
            throw error;
        }
    }
}
