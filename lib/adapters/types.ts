export interface AdapterMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface AdapterSettings {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
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
    { id: "pollinations-deepseek", provider: "pollinations", name: "Pollinations DeepSeek", description: "Free DeepSeek via Pollinations AI", supportsStreaming: true, defaultTemperature: 0.7, defaultMaxTokens: 2048 }
];

