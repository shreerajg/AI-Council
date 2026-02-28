"use client";

import { useCallback, useRef } from "react";
import { useCouncilStore } from "@/store/councilStore";
import { toast } from "sonner";

export function useCouncilStream() {
    const store = useCouncilStore();
    const eventSourceRef = useRef<EventSource | null>(null);

    const startStream = useCallback(
        async (message: string, threadId: string) => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            if (store.selectedModels.length === 0) {
                toast.error("Please select at least one model");
                return;
            }

            store.clearRuns();
            store.setSynthesis(null);

            // Mark all selected models as queued
            for (const modelId of store.selectedModels) {
                store.setRunStatus(modelId, "queued");
            }

            store.setIsStreaming(true);

            const params = new URLSearchParams({
                threadId,
                models: JSON.stringify(store.selectedModels),
                message,
                settings: JSON.stringify(store.modelSettings),
                concurrencyLimit: String(store.concurrencyLimit),
                contextMode: store.contextMode,
            });

            const es = new EventSource(`/api/council/stream?${params}`);
            eventSourceRef.current = es;

            es.addEventListener("start", (e) => {
                const data = JSON.parse(e.data);
                store.setRunStatus(data.modelId, "streaming");
            });

            es.addEventListener("token", (e) => {
                const data = JSON.parse(e.data);
                store.appendToken(data.modelId, data.text);
            });

            es.addEventListener("citation", (e) => {
                const data = JSON.parse(e.data);
                store.setRunCitations(data.modelId, data.citations);
            });

            es.addEventListener("usage", (e) => {
                const data = JSON.parse(e.data);
                store.setRunUsage(data.modelId, data.usage);
            });

            es.addEventListener("done", (e) => {
                const data = JSON.parse(e.data);
                store.setRunStatus(data.modelId, "done");
                store.setRunLatency(data.modelId, data.latencyMs);
            });

            es.addEventListener("model_error", (e) => {
                try {
                    const data = JSON.parse((e as MessageEvent).data);
                    store.setRunError(data.modelId, data.error);
                } catch {
                    // ignore
                }
            });

            es.addEventListener("fatal_error", (e) => {
                try {
                    const data = JSON.parse((e as MessageEvent).data);
                    toast.error(data.error || "Fatal stream error");
                } catch {
                    // ignore
                }
                store.setIsStreaming(false);
                es.close();
            });

            es.addEventListener("error", (e) => {
                // Real SSE connection error
                store.setIsStreaming(false);
                es.close();
                toast.error("Stream connection lost");
            });

            es.addEventListener("complete", () => {
                store.setIsStreaming(false);
                es.close();
                eventSourceRef.current = null;
            });
        },
        [store]
    );

    const stopStream = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        store.setIsStreaming(false);
    }, [store]);

    return { startStream, stopStream };
}
