export interface Email {
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
}

export interface Draft {
  id: string;
  message: {
    id: string;
    threadId: string;
    labelIds: string[];
  };
}

export interface CreateDraftRequest {
  to: string;
  subject: string;
  content: string;
  threadId?: string;
  id?: string;
}
