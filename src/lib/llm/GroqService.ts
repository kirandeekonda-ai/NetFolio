
import { LLMProvider, ExtractionResult } from './types';
import { Category } from '@/types';
import { sanitizeTextForLLM } from '@/utils/dataSanitization';
import { transactionPromptBuilder } from './PromptTemplateService';

export class GroqService implements LLMProvider {
    private apiKey: string;
    private modelName: string;
    private endpoint: string;

    constructor(config: {
        api_key: string;
        model_name: string;
        api_endpoint?: string;
    }) {
        this.apiKey = config.api_key;
        this.modelName = config.model_name || 'openai/gpt-oss-120b';
        this.endpoint = config.api_endpoint || 'https://api.groq.com/openai/v1';
    }

    async extractTransactions(pageText: string, userCategories: Category[] = []): Promise<ExtractionResult> {
        // Log user categories for debugging
        console.log('⚡ GROQ SERVICE - User categories received:', userCategories.length);
        if (userCategories.length > 0) {
            console.log('⚡ GROQ SERVICE - Category names:', userCategories.map(cat => cat.name));
        } else {
            console.log('⚠️ GROQ SERVICE - No user categories provided, using default examples');
        }

        // Sanitize input
        const sanitizationResult = sanitizeTextForLLM(pageText);
        const sanitizedPageText = sanitizationResult.sanitizedText;

        // Log sanitization summary
        if (sanitizationResult.detectedPatterns.length > 0) {
            console.log('🔐 Sanitized sensitive data before sending to Groq');
            console.log('🔐 Sanitization summary:', sanitizationResult.summary);
        }

        // Build prompt
        const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
            sanitizedPageText,
            userCategories
        );

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                console.log(`⚡ GROQ SERVICE - Sending request to ${this.endpoint} with model ${this.modelName} (Attempt ${attempts + 1}/${maxAttempts})`);

                const response = await fetch(`${this.endpoint}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: this.modelName,
                        messages: [
                            { role: 'user', content: prompt }
                        ],
                        // Reduced max_tokens to fit within generous TPM limits (4000 -> 2000)
                        max_tokens: 2000,
                        temperature: 0.1,
                    }),
                });

                // Log Groq Rate Limit Headers for visibility
                console.log('⚡ GROQ RATE LIMITS:');
                response.headers.forEach((value, key) => {
                    if (key.startsWith('x-ratelimit')) {
                        console.log(`  ${key}: ${value}`);
                    }
                });

                if (response.status === 429) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || '';

                    // Extract wait time from error message "Please try again in 3.28s"
                    const waitTimeMatch = errorMessage.match(/try again in (\d+(\.\d+)?)s/);
                    let waitTimeMs = 5000; // Default 5s

                    if (waitTimeMatch) {
                        waitTimeMs = Math.ceil(parseFloat(waitTimeMatch[1]) * 1000) + 1000; // Add 1s buffer
                    }

                    console.warn(`⚠️ GROQ RATE LIMIT REACHED: Waiting ${waitTimeMs}ms before retry...`);
                    // Notify client if possible or just wait server side
                    await new Promise(resolve => setTimeout(resolve, waitTimeMs));
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;

                if (!text) {
                    throw new Error('No response from Groq API');
                }

                const usage = {
                    prompt_tokens: data.usage?.prompt_tokens || 0,
                    completion_tokens: data.usage?.completion_tokens || 0
                };

                // Parse JSON response
                let parsedResponse;
                try {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    const jsonText = jsonMatch ? jsonMatch[0] : text;
                    parsedResponse = JSON.parse(jsonText);
                } catch (parseError) {
                    console.error('Failed to parse Groq response as JSON:', text);
                    return {
                        transactions: [],
                        usage,
                        securityBreakdown: sanitizationResult.summary
                    };
                }

                const transactions = Array.isArray(parsedResponse.transactions)
                    ? parsedResponse.transactions
                        .map((txn: any) => {
                            const amount = parseFloat(txn.amount) || 0;
                            const transaction_type = amount > 0 ? 'income' : 'expense';

                            return {
                                ...txn,
                                category: txn.suggested_category || txn.category || 'Uncategorized',
                                currency: txn.currency || 'INR',
                                type: transaction_type,
                                transaction_type: transaction_type,
                                amount: amount
                            };
                        })
                        .filter((transaction: any) => this.isValidTransaction(transaction))
                    : [];

                const balance_data = parsedResponse.balance_data ? {
                    opening_balance: parsedResponse.balance_data.opening_balance,
                    closing_balance: parsedResponse.balance_data.closing_balance,
                    available_balance: parsedResponse.balance_data.available_balance,
                    current_balance: parsedResponse.balance_data.current_balance,
                    balance_confidence: parsedResponse.balance_data.balance_confidence || 0,
                    balance_extraction_notes: parsedResponse.balance_data.balance_extraction_notes || 'No balance information extracted'
                } : undefined;

                console.log('⚡ GROQ SERVICE - extracted transactions:', transactions.length);

                return {
                    transactions,
                    balance_data,
                    usage,
                    securityBreakdown: sanitizationResult.summary
                };
            } catch (error) {
                if (attempts === maxAttempts - 1) {
                    console.error('Error calling Groq API after retries:', error);
                    throw error;
                }
                attempts++;
            }
        }

        throw new Error('Groq API request failed after maximum retries');
    }

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const testPrompt = transactionPromptBuilder.buildConnectionTestPrompt();
            const response = await fetch(`${this.endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [
                        { role: 'user', content: testPrompt }
                    ],
                    max_tokens: 50,
                    temperature: 0.1,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error?.message || `HTTP ${response.status}`
                };
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (!text) {
                return { success: false, error: 'No response from Groq API' };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private isValidTransaction(transaction: any): boolean {
        if (transaction && typeof transaction.currency !== 'string') {
            transaction.currency = 'INR';
        }
        return (
            transaction &&
            typeof transaction.date === 'string' &&
            typeof transaction.description === 'string' &&
            typeof transaction.amount === 'number' &&
            this.isValidDate(transaction.date)
        );
    }

    private isValidDate(dateString: string): boolean {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }
}
