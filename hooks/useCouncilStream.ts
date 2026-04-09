"use client";

import { useCallback, useRef, useEffect } from "react";
import { useCouncilStore } from "@/store/councilStore";
import { toast } from "sonner";

const SSE_TIMEOUT_MS = 60000; // 60 second timeout per model
const RECONNECT_DELAY_MS = 2000;

export function useCouncilStream() {
    const store = useCouncilStore();
    const eventSourceRef = useRef<EventSource | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    const startStream = useCallback(
        async (message: string, threadId: string) => {
            // Clean up previous connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
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

            try {
                const es = new EventSource(`/api/council/stream?${params}`);
                eventSourceRef.current = es;

                // Set timeout for SSE connection
                timeoutRef.current = setTimeout(() => {
                    if (store.isStreaming) {
                        toast.error("Connection timed out. Please try again.");
                        es.close();
                        store.setIsStreaming(false);
                    }
                }, 30000); // 30 second connection timeout

                es.addEventListener("start", (e) => {
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
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
                    if (store.isStreaming) {
                        store.setIsStreaming(false);
                        es.close();
                        toast.error("Stream connection lost. Retrying...");
                        
                        // Attempt reconnect after delay
                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (store.isStreaming === false) {
                                // Try starting again
                                startStream(message, threadId);
                            }
                        }, RECONNECT_DELAY_MS);
                    }
                });

                es.addEventListener("complete", () => {
                    store.setIsStreaming(false);
                    es.close();
                    eventSourceRef.current = null;
                });
            } catch (err) {
                console.error("Failed to start SSE stream:", err);
                toast.error("Failed to connect to stream");
                store.setIsStreaming(false);
            }
        },
        [store]
    );

    const stopStream = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        store.setIsStreaming(false);
    }, [store]);

    return { startStream, stopStream };
}
