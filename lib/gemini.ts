import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * Gemini LLM Client with retry logic and backoff
 * Used for DSR summary generation
 */

export interface DSRInput {
  userId: string;
  userName: string;
  date: string;
  tasks: Array<{
    title: string;
    status: string;
    description?: string;
  }>;
  conversations: Array<{
    contactName: string;
    messageCount: number;
    lastMessage: string;
    timestamp: string;
  }>;
  additionalNotes?: string;
}

export interface LLMResponse {
  success: boolean;
  summary: string;
  model: string;
  error?: string;
}

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor(apiKey: string, modelName: string = 'gemini-pro') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    return this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
  }

  /**
   * Generate DSR summary with retry logic
   */
  async generateDSRSummary(input: DSRInput): Promise<LLMResponse> {
    const prompt = this.buildDSRPrompt(input);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        return {
          success: true,
          summary,
          model: this.model.model,
        };
      } catch (error: any) {
        console.error(`Gemini API attempt ${attempt + 1} failed:`, error.message);

        // Check if we should retry
        if (attempt < this.maxRetries - 1) {
          const delay = this.getBackoffDelay(attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          // Final failure - return fallback
          return {
            success: false,
            summary: this.generateFallbackSummary(input),
            model: 'fallback',
            error: error.message,
          };
        }
      }
    }

    // Fallback if all retries fail
    return {
      success: false,
      summary: this.generateFallbackSummary(input),
      model: 'fallback',
      error: 'Max retries exceeded',
    };
  }

  /**
   * Build structured prompt for DSR generation
   */
  private buildDSRPrompt(input: DSRInput): string {
    const tasksSummary = input.tasks.length
      ? input.tasks
          .map(
            (t, i) =>
              `${i + 1}. [${t.status}] ${t.title}${t.description ? ` - ${t.description}` : ''}`
          )
          .join('\n')
      : 'No tasks recorded.';

    const conversationsSummary = input.conversations.length
      ? input.conversations
          .map(
            (c, i) =>
              `${i + 1}. ${c.contactName}: ${c.messageCount} messages (Last: "${c.lastMessage}" at ${c.timestamp})`
          )
          .join('\n')
      : 'No conversations recorded.';

    return `You are an assistant generating a Daily Status Report (DSR) for a college placement coordinator.

**Date:** ${input.date}
**User:** ${input.userName}

**Tasks:**
${tasksSummary}

**WhatsApp Conversations:**
${conversationsSummary}

${input.additionalNotes ? `**Additional Notes:**\n${input.additionalNotes}\n` : ''}

Generate a concise, professional DSR summary (max 300 words) covering:
1. Key accomplishments and task progress
2. Important student/company interactions
3. Any blockers or issues
4. Next steps or priorities

Use clear, professional language suitable for management review.`;
  }

  /**
   * Generate fallback summary when LLM fails
   */
  private generateFallbackSummary(input: DSRInput): string {
    const taskCount = input.tasks.length;
    const completedTasks = input.tasks.filter((t) => t.status === 'DONE').length;
    const conversationCount = input.conversations.length;

    return `**Daily Status Report - ${input.date}**

**Summary:**
${input.userName} worked on ${taskCount} task(s), completing ${completedTasks}. Engaged in ${conversationCount} WhatsApp conversation(s).

**Tasks:**
${input.tasks.map((t) => `- [${t.status}] ${t.title}`).join('\n') || '- No tasks'}

**Conversations:**
${input.conversations.map((c) => `- ${c.contactName} (${c.messageCount} messages)`).join('\n') || '- No conversations'}

${input.additionalNotes ? `**Notes:**\n${input.additionalNotes}` : ''}

*Note: This is an automated fallback summary. LLM generation was unavailable.*`;
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello, respond with "OK" if you can read this.');
      const response = await result.response;
      return response.text().length > 0;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
    geminiClient = new GeminiClient(apiKey, modelName);
  }
  return geminiClient;
}

// Rate limiting helper
export class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 30, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.limit) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.limit - this.requests.length);
  }
}

export const dsrRateLimiter = new RateLimiter(10, 60000); // 10 DSR generations per minute
