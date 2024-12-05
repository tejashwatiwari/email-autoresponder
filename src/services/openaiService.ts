import { OpenAI } from 'openai';
import toast from 'react-hot-toast';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface QueuedRequest {
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing: boolean = false;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval = 200; // 200ms between requests should be sufficient
  private readonly maxRetries = 2; // Reduce retries since we're handling simple classification
  private readonly baseDelay = 500; // Reduced base delay for retries
  private readonly maxDelay = 5000; // Max 5 seconds delay is enough for our use case

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        operation,
        resolve,
        reject,
        retryCount: 0
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const now = Date.now();
    const timeToWait = Math.max(0, this.lastRequestTime + this.minRequestInterval - now);

    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    const request = this.queue.shift()!;

    try {
      const result = await request.operation();
      this.lastRequestTime = Date.now();
      request.resolve(result);
    } catch (error: any) {
      if (error?.response?.status === 429 && request.retryCount < this.maxRetries) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        const delay = Math.min(
          this.baseDelay * Math.pow(2, request.retryCount),
          this.maxDelay
        );
        
        console.log(`Rate limited. Waiting ${retryAfter || delay/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, (retryAfter * 1000) || delay));
        
        this.queue.unshift({
          ...request,
          retryCount: request.retryCount + 1
        });
      } else {
        request.reject(error);
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
}

export enum EmailCategory {
  APPRECIATION = 'appreciation',
  FEEDBACK = 'feedback',
  SUPPORT = 'support',
  PRICING = 'pricing',
  SALES = 'sales',
  SPAM = 'spam',
  OTHER = 'other'
}

class OpenAIService {
  private static instance: OpenAIService;
  private requestQueue: RequestQueue;

  private constructor() {
    this.requestQueue = new RequestQueue();
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async classifyEmail(emailContent: string): Promise<{ category: EmailCategory }> {
    return await this.requestQueue.add(async () => {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an email classifier for a software company. Analyze each email carefully and classify it into EXACTLY ONE of these categories:

              - appreciation: Thank you notes, positive feedback without specific requests
              - feedback: Bug reports, feature requests, product improvement suggestions
              - support: Technical issues, access problems, how-to questions
              - pricing: Billing questions, refund requests, payment issues
              - sales: Enterprise/team inquiries, security reviews (SOC2, compliance), trial requests
              - spam: Hiring pitches, virtual assistant offers, unsolicited services, cold emails
              - other: Anything that doesn't fit above categories

              Classification Guidelines:
              1. SALES category includes:
                 - Security review or compliance requests (SOC2, security documentation)
                 - Enterprise or team trial inquiries
                 - Questions about enterprise features or licensing
                 - Security team assessments
                 - White paper or documentation requests for enterprise evaluation

              2. SPAM category includes:
                 - Virtual assistant or recruitment offers
                 - Unsolicited service proposals
                 - Cold emails about scaling business
                 - Mass marketing emails
                 - Job applications or resumes

              3. Priority Rules:
                 - If email mentions both security/compliance AND technical issues, classify as SALES
                 - If email contains multiple categories, choose the most business-critical one
                 
              Return ONLY the category name in lowercase, nothing else.`
            },
            {
              role: 'user',
              content: emailContent
            }
          ],
          temperature: 0.2,
          max_tokens: 50
        });

        const category = response.choices[0]?.message?.content?.toLowerCase().trim() as EmailCategory;
        
        if (!Object.values(EmailCategory).includes(category)) {
          console.warn('Invalid category returned:', category);
          return { category: EmailCategory.OTHER };
        }

        return { category };
      } catch (error) {
        console.error('Error classifying email:', error);
        throw error;
      }
    });
  }

  async generateDraftReply(emailContent: string, context: string): Promise<string> {
    try {
      return await this.requestQueue.add(async () => {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: context
            },
            {
              role: "user",
              content: emailContent
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        return completion.choices[0]?.message?.content || '';
      });
    } catch (error: any) {
      console.error('Error generating draft reply:', error);
      if (error.response?.status === 429) {
        toast.error('OpenAI rate limit reached. Your request has been queued.');
      } else {
        toast.error('Failed to generate reply. Please try again.');
      }
      throw error;
    }
  }
}

export const openaiService = OpenAIService.getInstance();
