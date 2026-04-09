import pLimit from "p-limit";
import { getAdapter } from "./adapters";
import type { AdapterMessage, AdapterSettings } from "./adapters/types";

export type SSEEvent =
    | { event: "start"; modelId: string }
    | { event: "token"; modelId: string; text: string }
    | { event: "citation"; modelId: string; citations: { url: string; title?: string }[] }
    | { event: "usage"; modelId: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
    | { event: "done"; modelId: string; latencyMs: number }
    | { event: "model_error"; modelId: string; error: string };

export interface OrchestratorOptions {
    messages: AdapterMessage[];
    selectedModels: string[];
    settings: Record<string, AdapterSettings>;
    concurrencyLimit?: number;
    signal: AbortSignal;
    onEvent: (event: SSEEvent) => void;
}

async function runModelWithRetry(
    modelId: string,
    messages: AdapterMessage[],
    settings: AdapterSettings,
    signal: AbortSignal,
    onEvent: (event: SSEEvent) => void,
    maxRetries = 2
): Promise<void> {
    const startTime = Date.now();
    onEvent({ event: "start", modelId });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (signal.aborted) return;

            let adapter;
            try {
                adapter = getAdapter(modelId);
            } catch (adapterErr) {
                const errMsg = adapterErr instanceof Error ? adapterErr.message : String(adapterErr);
                onEvent({ event: "model_error", modelId, error: `Adapter not available: ${errMsg}` });
                return;
            }

            for await (const chunk of adapter.stream(messages, settings, signal)) {
                if (signal.aborted) return;
                if (chunk.type === "token") {
                    onEvent({ event: "token", modelId, text: chunk.text });
                } else if (chunk.type === "citation") {
                    onEvent({ event: "citation", modelId, citations: chunk.citations });
                } else if (chunk.type === "usage") {
                    onEvent({ event: "usage", modelId, usage: chunk.usage });
                } else if (chunk.type === "error") {
                    throw new Error(chunk.error);
                }
            }
            const latencyMs = Date.now() - startTime;
            onEvent({ event: "done", modelId, latencyMs });
            return;
        } catch (err) {
            if (signal.aborted) return;
            const isLastAttempt = attempt === maxRetries;
            if (isLastAttempt) {
                const errMsg = err instanceof Error ? err.message : String(err);
                onEvent({ event: "model_error", modelId, error: errMsg });
                return;
            }
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
    }
}

export async function orchestrate(options: OrchestratorOptions): Promise<void> {
    const { messages, selectedModels, settings, concurrencyLimit = 4, signal, onEvent } = options;
    
    if (!selectedModels || selectedModels.length === 0) {
        onEvent({ event: "model_error", modelId: "system", error: "No models selected" });
        return;
    }

    const limit = pLimit(concurrencyLimit);

    const tasks = selectedModels.map((modelId) =>
        limit(() =>
            runModelWithRetry(
                modelId,
                messages,
                settings[modelId] || {},
                signal,
                onEvent
            )
        )
    );

    try {
        await Promise.allSettled(tasks);
    } catch (err) {
        console.error("Orchestrator error:", err);
    }
}
