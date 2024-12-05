import { PromptTemplate } from '../types';

export const defaultPromptTemplates: PromptTemplate[] = [
    {
        id: 'appreciation',
        name: 'Appreciation Response',
        template: `Thank you for your kind words about Codeium! We're thrilled to hear that you're finding value in our product. Your feedback motivates us to keep improving and delivering the best possible experience.

Best regards,
[Your name]`
    },
    {
        id: 'feature-request',
        name: 'Feature Request Response',
        template: `Thank you for your feature suggestion! We appreciate you taking the time to share your thoughts on how we can improve Codeium.

We'll carefully consider your suggestion as we plan our future updates. Your feedback helps us understand what our users need and how we can make Codeium even better.

Best regards,
[Your name]`
    },
    {
        id: 'support',
        name: 'Support Response',
        template: `Thank you for reaching out about this issue. I understand you're experiencing [summarize the issue], and I'd be happy to help.

Could you please provide:
1. Steps to reproduce the issue
2. Your operating system and IDE version
3. Any error messages you're seeing

This will help us investigate and resolve the issue more quickly.

Best regards,
[Your name]`
    }
];

export class PromptService {
    private static instance: PromptService;

    private constructor() {}

    public static getInstance(): PromptService {
        if (!PromptService.instance) {
            PromptService.instance = new PromptService();
        }
        return PromptService.instance;
    }

    getContextForIntent(intent: string): string {
        // Base context that applies to all responses
        const baseContext = `You are a helpful email assistant. Your responses should be:
        - Professional and courteous
        - Clear and concise
        - Empathetic when appropriate
        - Action-oriented when needed`;

        // Add specific context based on the detected intent
        if (intent.toLowerCase().includes('appreciation')) {
            return `${baseContext}
            For thank you emails and positive feedback:
            - Express genuine appreciation for their kind words
            - Reinforce the positive interaction
            - Keep the response warm but professional`;
        }

        if (intent.toLowerCase().includes('feature')) {
            return `${baseContext}
            For feature requests and suggestions:
            - Thank them for their feedback
            - Acknowledge the specific suggestion
            - Explain that their feedback will be considered
            - Do not make specific promises about implementation`;
        }

        if (intent.toLowerCase().includes('support')) {
            return `${baseContext}
            For technical support inquiries:
            - Show understanding of their issue
            - Provide clear, step-by-step assistance if possible
            - If the issue requires escalation, explain the next steps
            - Include relevant documentation links if available`;
        }

        if (intent.toLowerCase().includes('pricing')) {
            return `${baseContext}
            For pricing and billing questions:
            - Be clear and transparent about pricing information
            - Explain the value proposition
            - Direct them to specific pricing resources
            - Offer to connect them with sales if needed`;
        }

        // Default context for other types of emails
        return `${baseContext}
        For general inquiries:
        - Address their specific question or concern
        - Provide relevant information
        - Offer additional assistance if needed`;
    }

    getTemplate(category: string): string {
        const templates: Record<string, string> = {
            appreciation: "Thank you for your kind words! We truly appreciate your feedback and support.",
            feature_request: "Thank you for your suggestion. We value your input and will carefully consider it for future updates.",
            support: "I understand you are experiencing an issue. Let me help you resolve that.",
            pricing: "Thank you for your interest. Here is the information about our pricing:"
        };

        return templates[category] || "Thank you for your message. Let me assist you with that.";
    }
}
