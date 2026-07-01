"use client";

import { useCallback, useRef, useEffect } from "react";
import { useCouncilStore } from "@/store/councilStore";
import { toast } from "sonner";
import type { WorkflowStep } from "@/lib/workflow";

export function useWorkflowStream() {
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

    const stopWorkflow = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        store.setWorkflowExecuting(false);
    }, [store]);

    const startWorkflow = useCallback(
        async (threadId: string, workflowName: string, steps: WorkflowStep[], input: string) => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            store.clearWorkflowState();
            store.setWorkflowExecuting(true);

            const params = new URLSearchParams({
                threadId,
                workflowName,
                steps: JSON.stringify(steps),
                input,
            });

            try {
                const es = new EventSource(`/api/workflow/stream?${params}`);
                eventSourceRef.current = es;

                timeoutRef.current = setTimeout(() => {
                    if (store.workflowState.isExecuting) {
                        toast.error("Workflow timed out. Please try again.");
                        es.close();
                        store.setWorkflowExecuting(false);
                    }
                }, 120000);

                es.addEventListener("workflow_start", (e) => {
                    const data = JSON.parse(e.data);
                    toast.info("Workflow started");
                });

                es.addEventListener("step_start", (e) => {
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = setTimeout(() => {
                            if (store.workflowState.isExecuting) {
                                toast.error("Workflow step timed out");
                                es.close();
                                store.setWorkflowExecuting(false);
                            }
                        }, 120000);
                    }
                    const data = JSON.parse(e.data);
                    store.setWorkflowStep(data.stepIndex);
                    toast.info(`Step ${data.stepIndex + 1}: ${data.type} (${data.modelId})`);
                });

                es.addEventListener("step_token", (e) => {
                    const data = JSON.parse(e.data);
                    store.setWorkflowStepOutput(data.stepIndex, data.text);
                });

                es.addEventListener("step_done", (e) => {
                    const data = JSON.parse(e.data);
                    toast.success(`Step ${data.stepIndex + 1} complete (${data.latencyMs}ms)`);
                });

                es.addEventListener("step_error", (e) => {
                    const data = JSON.parse(e.data);
                    toast.error(`Step ${data.stepIndex + 1} failed: ${data.error}`);
                });

                es.addEventListener("workflow_complete", () => {
                    store.setWorkflowExecuting(false);
                    toast.success("Workflow completed!");
                    es.close();
                    eventSourceRef.current = null;
                });

                es.addEventListener("workflow_error", (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        toast.error(`Workflow error: ${data.error}`);
                    } catch {
                        toast.error("Workflow error occurred");
                    }
                    store.setWorkflowExecuting(false);
                    es.close();
                });

                es.addEventListener("fatal_error", (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        toast.error(data.error || "Fatal workflow error");
                    } catch {
                        toast.error("Fatal workflow error");
                    }
                    store.setWorkflowExecuting(false);
                    es.close();
                });

                es.addEventListener("error", () => {
                    if (store.workflowState.isExecuting) {
                        store.setWorkflowExecuting(false);
                        es.close();
                        toast.error("Workflow connection lost");
                    }
                });
            } catch (err) {
                console.error("Failed to start workflow:", err);
                toast.error("Failed to start workflow");
                store.setWorkflowExecuting(false);
            }
        },
        [store]
    );

    return { startWorkflow, stopWorkflow };
}
