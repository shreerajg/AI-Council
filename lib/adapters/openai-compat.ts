import OpenAI from "openai";
import type { AdapterMessage, AdapterSettings, ModelAdapter, StreamChunk } from "./types";

export function createOpenAICompatAdapter(
    modelId: string,
    baseURL: string,
    apiKey: string,
    displayName?: string
): ModelAdapter {
    return {
        id: `compat:${modelId}`,
        name: displayName || modelId,
        provider: "openai-compat",
        supportsStreaming: true,

        async *stream(
            messages: AdapterMessage[],
            settings: AdapterSettings,
            signal: AbortSignal
        ): AsyncIterable<StreamChunk> {
            if (!apiKey) {
                throw new Error("API key not configured");
            }

            let client: OpenAI;
            try {
                client = new OpenAI({ apiKey, baseURL });
            } catch (err) {
                throw new Error(`Failed to initialize OpenAI client: ${err instanceof Error ? err.message : String(err)}`);
            }

            const systemMessage = settings.systemPrompt
                ? [{ role: "system" as const, content: settings.systemPrompt }]
                : [];

            const apiMessages = [
                ...systemMessage,
                ...messages.map((m) => ({
                    role: m.role as "user" | "assistant" | "system",
                    content: m.content,
                })),
            ];

            let response;
            try {
                response = await client.chat.completions.create(
                    {
                        model: displayName || modelId,
                        messages: apiMessages,
                        stream: true,
                        temperature: settings.temperature ?? 0.7,
                        max_tokens: settings.maxTokens ?? 2048,
                        top_p: 0.7,
                    },
                    { signal }
                );
            } catch (err) {
                if (err instanceof Error) {
                    if (err.name === "AbortError" || err.message.includes("aborted")) {
                        return;
                    }
                    if (err.message.includes("401") || err.message.includes("unauthorized")) {
                        throw new Error("Invalid API key. Please check your credentials.");
                    }
                    if (err.message.includes("429") || err.message.includes("rate limit")) {
                        throw new Error("Rate limit exceeded. Please try again later.");
                    }
                    if (err.message.includes("503") || err.message.includes("unavailable")) {
                        throw new Error("Service unavailable. Please try again later.");
                    }
                }
                throw err;
            }

            let promptTokens = 0;
            let completionTokens = 0;

            try {
                for await (const chunk of response as any) {
                    if (signal.aborted) break;
                    const delta = chunk.choices[0]?.delta?.content;
                    if (delta) {
                        yield { type: "token", text: delta };
                    }
                    if (chunk.usage) {
                        promptTokens = chunk.usage.prompt_tokens;
                        completionTokens = chunk.usage.completion_tokens;
                    }
                }
            } catch (err) {
                if (signal.aborted) return;
                throw err;
            }

            if (promptTokens > 0 || completionTokens > 0) {
                yield {
                    type: "usage",
                    usage: {
                        promptTokens,
                        completionTokens,
                        totalTokens: promptTokens + completionTokens,
                    },
                };
            }
        },
    };
}
