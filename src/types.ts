export interface Email {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body?: string;
    labels: string[];
}

export interface GmailLabel {
    id: string;
    name: string;
    type: string;
    messageListVisibility?: string;
    labelListVisibility?: string;
}

export interface EmailDraft {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
}

export interface PromptTemplate {
    id: string;
    name: string;
    template: string;
}

export interface Draft {
    id: string;
    message: {
        threadId: string;
        raw: string;
    };
}

export interface CreateDraftRequest {
    threadId: string;
    message: {
        raw: string;
        threadId: string;
    };
}
