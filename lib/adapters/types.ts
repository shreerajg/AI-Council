export interface AdapterMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface AdapterSettings {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    apiKey?: string;
}

export interface UsageInfo {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ModelAdapter {
    id: string;
    name: string;
    provider: string;
    description?: string;
    supportsStreaming: boolean;
    supportsCitations?: boolean;

    stream(
        messages: AdapterMessage[],
        settings: AdapterSettings,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk>;
}

export type StreamChunk =
    | { type: "token"; text: string }
    | { type: "citation"; citations: Citation[] }
    | { type: "usage"; usage: UsageInfo }
    | { type: "error"; error: string };

export interface Citation {
    url: string;
    title?: string;
    snippet?: string;
}

export interface ModelConfig {
    id: string;
    provider: string;
    name: string;
    description: string;
    supportsStreaming: boolean;
    supportsCitations?: boolean;
    defaultTemperature: number;
    defaultMaxTokens: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    // Pollinations AI (Free)
    { id: "pollinations-openai", provider: "pollinations", name: "Pollinations GPT-4o", description: "Free GPT-4o via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "pollinations-claude", provider: "pollinations", name: "Pollinations Claude", description: "Free Claude via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "pollinations-llama", provider: "pollinations", name: "Pollinations Llama", description: "Free Llama via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "pollinations-mistral", provider: "pollinations", name: "Pollinations Mistral", description: "Free Mistral via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "pollinations-gemini", provider: "pollinations", name: "Pollinations Gemini", description: "Free Gemini via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "pollinations-deepseek", provider: "pollinations", name: "Pollinations DeepSeek", description: "Free DeepSeek via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    
    // StepFun
    { id: "stepfun-step-1-8k", provider: "stepfun", name: "StepFun 1 8K", description: "StepFun 1 8K Model", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "stepfun-step-1-flash", provider: "stepfun", name: "StepFun 1 Flash", description: "StepFun Flash Model", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    
    // Zhipu AI (GLM)
    { id: "zhipu-glm-4-flash", provider: "zhipu", name: "GLM-4 Flash", description: "Free GLM-4 via Zhipu AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "zhipu-glm-4-flashx", provider: "zhipu", name: "GLM-4 FlashX", description: "Free GLM-4 via Zhipu AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    
    // Google Gemini
    { id: "gemini-gemini-1.5-flash", provider: "gemini", name: "Gemini 1.5 Flash", description: "Google Gemini 1.5 Flash", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 },
    { id: "gemini-gemini-2.0-flash-exp", provider: "gemini", name: "Gemini 2.0 Flash Exp", description: "Google Gemini 2.0 Flash Experimental", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 }
];

