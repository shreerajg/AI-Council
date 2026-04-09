import OpenAI from "openai";
import type { AdapterMessage, AdapterSettings, ModelAdapter, StreamChunk } from "./types";

export function createPollinationsAdapter(modelId: string): ModelAdapter {
    const pollinationsModelName = modelId.replace("pollinations-", "");

    return {
        id: modelId,
        name: pollinationsModelName,
        provider: "pollinations",
        supportsStreaming: true,

        async *stream(
            messages: AdapterMessage[],
            settings: AdapterSettings,
            signal: AbortSignal
        ): AsyncIterable<StreamChunk> {
            let client: OpenAI;
            try {
                client = new OpenAI({
                    baseURL: "https://text.pollinations.ai/openai",
                    apiKey: "free"
                });
            } catch (err) {
                throw new Error(`Failed to initialize Pollinations client: ${err instanceof Error ? err.message : String(err)}`);
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

            let streamResponse;
            try {
                streamResponse = await client.chat.completions.create(
                    {
                        model: pollinationsModelName,
                        messages: apiMessages,
                        stream: true,
                        jsonMode: false,
                        temperature: settings.temperature ?? 0.7,
                        max_tokens: settings.maxTokens ?? 2048,
                    } as Parameters<typeof client.chat.completions.create>[0],
                    { signal }
                );
            } catch (err) {
                if (err instanceof Error) {
                    if (err.name === "AbortError" || err.message.includes("aborted")) {
                        return;
                    }
                    if (err.message.includes("fetch failed") || err.message.includes("network")) {
                        throw new Error("Network error. Please check your connection.");
                    }
                }
                throw err;
            }

            let promptTokens = 0;
            let completionTokens = 0;

            try {
                for await (const chunk of streamResponse as any) {
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
