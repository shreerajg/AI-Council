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
            const client = new OpenAI({ apiKey, baseURL });

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

            const response = await client.chat.completions.create(
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

            let promptTokens = 0;
            let completionTokens = 0;

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
