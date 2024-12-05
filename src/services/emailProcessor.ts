import { Email } from '../types';
import { EMAIL_LABELS } from '../config';
import { GmailService } from './gmailService';
import { openaiService, EmailCategory } from './openaiService';
import { PromptService } from './promptTemplates';
import { gmailApi } from './gmailApi';

export class EmailProcessor {
    private static instance: EmailProcessor;
    private gmailService: GmailService;
    private promptService: PromptService;
    private isProcessing: boolean = false;
    private currentPage: number = 0;
    private readonly batchSize: number = 30;
    public hasMoreEmails: boolean = true;

    private constructor() {
        this.gmailService = GmailService.getInstance();
        this.promptService = PromptService.getInstance();
    }

    public static getInstance(): EmailProcessor {
        if (!EmailProcessor.instance) {
            EmailProcessor.instance = new EmailProcessor();
        }
        return EmailProcessor.instance;
    }

    public stopProcessing(): void {
        this.isProcessing = false;
    }

    public isCurrentlyProcessing(): boolean {
        return this.isProcessing;
    }

    public resetPagination(): void {
        this.currentPage = 0;
    }

    private async createLabelIfNotExists(labelName: string): Promise<void> {
        try {
            // Check if the label exists first
            const existingLabel = await gmailApi.findLabelByName(labelName);
            if (existingLabel) {
                console.log(`Label ${labelName} already exists with ID ${existingLabel.id}`);
                return;
            }

            // Create the label if it doesn't exist
            console.log(`Creating new label: ${labelName}`);
            await gmailApi.createLabel(labelName);
        } catch (error) {
            console.error(`Error creating label ${labelName}:`, error);
            // Don't throw the error, just log it and continue
        }
    }

    private async applyLabelsToEmail(emailId: string, category: EmailCategory, subLabels: string[]): Promise<void> {
        try {
            // Apply the main category label
            await gmailApi.addLabel(emailId, category);

            // Apply sub-labels only if it's not an appreciation email
            if (category !== EmailCategory.APPRECIATION && subLabels.length > 0) {
                for (const label of subLabels) {
                    await gmailApi.addLabel(emailId, label);
                }
            }
        } catch (error) {
            console.error('Error applying labels:', error);
            throw error;
        }
    }

    private hasLabel(email: Email, labelName: string): boolean {
        return email.labels.some(label => label === labelName);
    }

    private encodeBase64(str: string): string {
        try {
            return btoa(unescape(encodeURIComponent(str)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        } catch (error) {
            console.error('Error encoding to base64:', error);
            throw error;
        }
    }

    private isRateLimitContent(content: string): boolean {
        const lowerContent = content.toLowerCase();
        const rateLimitTerms = [
            'rate',
            'limit',
            'resource',
            'exhausted',
            'resource_exhausted',
            'rate limit',
            'rate_limit',
            'errorserver encountered error of type: resource_exhausted'
        ];

        return rateLimitTerms.some(term => lowerContent.includes(term));
    }

    async processEmail(email: Email): Promise<void> {
        try {
            // Check if email is already processed
            if (this.hasLabel(email, 'Processed') || this.hasLabel(email, 'RateLimit')) {
                console.log(`Email ${email.id} already processed, skipping`);
                return;
            }

            // Get email content
            const emailContent = `${email.subject}\n${email.snippet || ''}\n${email.body || ''}`;

            // Check for rate limit mentions first
            if (this.isRateLimitContent(emailContent)) {
                console.log('Rate limit related content detected, applying RateLimit label');
                await gmailApi.addLabel(email.id, 'RateLimit');
                await gmailApi.addLabel(email.id, 'Processed');
                return;
            }

            // Use OpenAI to classify the email
            console.log(`Classifying email ${email.id}`);
            const { category } = await openaiService.classifyEmail(emailContent);
            
            // Create the label if it doesn't exist
            console.log(`Creating/checking label: ${category}`);
            await this.createLabelIfNotExists(category);
            
            // Apply the category label
            console.log(`Applying label ${category} to email ${email.id}`);
            await gmailApi.addLabel(email.id, category);
            
            // Mark as processed
            await gmailApi.addLabel(email.id, 'Processed');

            console.log(`Successfully processed email ${email.id}`);
        } catch (error) {
            console.error('Error processing email:', error);
            
            // Also check if the error itself contains rate limit terms
            if (error instanceof Error && this.isRateLimitContent(error.message)) {
                console.log('Rate limit error detected, applying RateLimit label');
                await gmailApi.addLabel(email.id, 'RateLimit');
                await gmailApi.addLabel(email.id, 'Processed');
            }
            
            throw error;
        }
    }

    async processNewEmails(): Promise<{ processedCount: number, hasMore: boolean }> {
        try {
            if (this.isProcessing) {
                console.log('Already processing emails, skipping');
                return { processedCount: 0, hasMore: false };
            }

            this.isProcessing = true;
            
            // Create the Processed label if it doesn't exist
            await this.createLabelIfNotExists('Processed');
            
            // Get unprocessed emails from inbox
            const response = await gmailApi.getEmails();
            const unprocessedEmails = response.emails.filter(email => {
                const isProcessed = this.hasLabel(email, 'Processed');
                const hasRateLimit = this.hasLabel(email, 'RateLimit');
                
                if (isProcessed || hasRateLimit) {
                    console.log(`Skipping email ${email.id} - Processed: ${isProcessed}, RateLimit: ${hasRateLimit}`);
                    return false;
                }
                return true;
            });
            
            console.log(`Found ${unprocessedEmails.length} unprocessed emails`);
            
            const startIndex = this.currentPage * this.batchSize;
            const currentBatch = unprocessedEmails.slice(startIndex, startIndex + this.batchSize);
            this.hasMoreEmails = startIndex + this.batchSize < unprocessedEmails.length;
            
            console.log(`Processing batch ${this.currentPage + 1} (${currentBatch.length} emails)`);
            
            for (const email of currentBatch) {
                if (!this.isProcessing) {
                    console.log('Processing stopped by user');
                    break;
                }
                await this.processEmail(email);
            }

            this.currentPage++;
            return {
                processedCount: currentBatch.length,
                hasMore: this.hasMoreEmails
            };
        } catch (error) {
            console.error('Error in email processing:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }
}