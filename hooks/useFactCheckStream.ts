"use client";

import { useCallback, useRef, useEffect } from "react";
import { useCouncilStore } from "@/store/councilStore";
import { toast } from "sonner";
import type { FactCheckResult } from "@/lib/factcheck";

export function useFactCheckStream() {
    const store = useCouncilStore();
    const eventSourceRef = useRef<EventSource | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const stopFactCheck = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        store.setFactCheckChecking(false);
    }, [store]);

    const startFactCheck = useCallback(
        async (threadId: string, claims: string[], checkers: string[], modelRunId?: string) => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            store.clearFactCheckState();
            store.setFactCheckChecking(true);

            const params = new URLSearchParams({
                threadId,
                claims: JSON.stringify(claims),
                checkers: JSON.stringify(checkers),
                modelRunId: modelRunId || "",
            });

            try {
                const es = new EventSource(`/api/factcheck?${params}`);
                eventSourceRef.current = es;

                timeoutRef.current = setTimeout(() => {
                    if (store.factCheckState.isChecking) {
                        toast.error("Fact check timed out");
                        es.close();
                        store.setFactCheckChecking(false);
                    }
                }, 60000);

                es.addEventListener("factcheck_start", (e) => {
                    const data = JSON.parse(e.data);
                    toast.info(`Verifying ${data.totalClaims} claim(s)...`);
                });

                es.addEventListener("claim_start", (e) => {
                    const data = JSON.parse(e.data);
                });

                es.addEventListener("checking", (e) => {
                    const data = JSON.parse(e.data);
                });

                es.addEventListener("check_result", (e) => {
                    const data = JSON.parse(e.data);
                    store.addFactCheckResult(data.claimIndex, data.result);
                });

                es.addEventListener("claim_complete", (e) => {
                    const data = JSON.parse(e.data);
                    toast.success(`Claim ${data.claimIndex + 1} verified`);
                });

                es.addEventListener("factcheck_complete", (e) => {
                    const data = JSON.parse(e.data);
                    store.setFactCheckChecking(false);
                    toast.success("Fact check complete!");
                    es.close();
                    eventSourceRef.current = null;
                });

                es.addEventListener("factcheck_error", (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        toast.error(`Fact check error: ${data.error}`);
                    } catch {
                        toast.error("Fact check error occurred");
                    }
                    store.setFactCheckChecking(false);
                    es.close();
                });

                es.addEventListener("fatal_error", (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        toast.error(data.error || "Fatal fact check error");
                    } catch {
                        toast.error("Fatal fact check error");
                    }
                    store.setFactCheckChecking(false);
                    es.close();
                });

                es.addEventListener("error", () => {
                    if (store.factCheckState.isChecking) {
                        store.setFactCheckChecking(false);
                        es.close();
                        toast.error("Fact check connection lost");
                    }
                });
            } catch (err) {
                console.error("Failed to start fact check:", err);
                toast.error("Failed to start fact check");
                store.setFactCheckChecking(false);
            }
        },
        [store]
    );

    return { startFactCheck, stopFactCheck };
}
