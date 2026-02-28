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
            const client = new OpenAI({
                baseURL: "https://text.pollinations.ai/openai",
                apiKey: "free" // Pollinations does not require an API key
            });

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

            const streamResponse = await client.chat.completions.create(
                {
                    model: pollinationsModelName,
                    messages: apiMessages,
                    stream: true,
                    jsonMode: false,
                } as Parameters<typeof client.chat.completions.create>[0],
                { signal }
            );

            let promptTokens = 0;
            let completionTokens = 0;

            for await (const chunk of streamResponse as any) {
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
