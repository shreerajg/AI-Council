import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdapterSettings } from "@/lib/adapters/types";

export type ModelStatus = "idle" | "queued" | "streaming" | "done" | "error";

export interface ModelRun {
    modelId: string;
    status: ModelStatus;
    output: string;
    error?: string;
    latencyMs?: number;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    citations?: { url: string; title?: string }[];
    runId?: string;
    rating?: number | null;
}

export interface Thread {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface FactCheckResult {
    claim: string;
    checkerModel: string;
    verdict: "true" | "false" | "uncertain";
    reasoning: string;
    confidence: number;
}

export interface FactCheckState {
    isChecking: boolean;
    results: FactCheckResult[][];
}

export interface WorkflowState {
    isExecuting: boolean;
    currentStep: number;
    outputs: Record<number, string>;
}

export interface CouncilStore {
    // Thread management
    threads: Thread[];
    currentThreadId: string | null;
    setThreads: (threads: Thread[]) => void;
    setCurrentThread: (id: string | null) => void;
    addThread: (thread: Thread) => void;
    removeThread: (id: string) => void;

    // Model selection
    selectedModels: string[];
    toggleModel: (modelId: string) => void;
    setSelectedModels: (models: string[]) => void;

    // Per-model settings
    modelSettings: Record<string, AdapterSettings>;
    updateModelSettings: (modelId: string, settings: Partial<AdapterSettings>) => void;

    // Global settings
    concurrencyLimit: number;
    setConcurrencyLimit: (n: number) => void;
    contextMode: "shared" | "separate";
    setContextMode: (mode: "shared" | "separate") => void;
    synthesizerModel: string;
    setSynthesizerModel: (model: string) => void;

    // Current run state
    currentRuns: Record<string, ModelRun>;
    setRunStatus: (modelId: string, status: ModelStatus) => void;
    appendToken: (modelId: string, text: string) => void;
    setRunUsage: (modelId: string, usage: ModelRun["usage"]) => void;
    setRunDone: (modelId: string, latencyMs: number, runId?: string) => void;
    setRunError: (modelId: string, error: string) => void;
    setRunCitations: (modelId: string, citations: ModelRun["citations"]) => void;
    clearRuns: () => void;
    setCurrentRuns: (runs: Record<string, ModelRun>) => void;

    // Synthesis
    synthesis: string | null;
    isSynthesizing: boolean;
    setSynthesis: (text: string | null) => void;
    setIsSynthesizing: (v: boolean) => void;

    // UI state
    isStreaming: boolean;
    setIsStreaming: (v: boolean) => void;
    expandedModel: string | null;
    setExpandedModel: (modelId: string | null) => void;
    settingsOpen: boolean;
    setSettingsOpen: (v: boolean) => void;
    
    // Share state
    currentShareToken: string | null;
    setCurrentShareToken: (token: string | null) => void;

    // Workflow state
    workflowState: WorkflowState;
    setWorkflowExecuting: (executing: boolean) => void;
    setWorkflowStep: (step: number) => void;
    setWorkflowStepOutput: (step: number, text: string) => void;
    clearWorkflowState: () => void;

    // Fact Check state
    factCheckState: FactCheckState;
    setFactCheckChecking: (checking: boolean) => void;
    setFactCheckResults: (results: FactCheckResult[][]) => void;
    addFactCheckResult: (claimIndex: number, result: FactCheckResult) => void;
    clearFactCheckState: () => void;
}

export const useCouncilStore = create<CouncilStore>()(
    persist(
        (set) => ({
            threads: [],
            currentThreadId: null,
            setThreads: (threads) => set({ threads }),
            setCurrentThread: (id) => set({ currentThreadId: id }),
            addThread: (thread) =>
                set((s) => ({ threads: [thread, ...s.threads] })),
            removeThread: (id) =>
                set((s) => ({ threads: s.threads.filter((t) => t.id !== id) })),

            selectedModels: ["pollinations-openai", "nvidia-llama-3-3"],
            toggleModel: (modelId) =>
                set((s) => ({
                    selectedModels: s.selectedModels.includes(modelId)
                        ? s.selectedModels.filter((m) => m !== modelId)
                        : [...s.selectedModels, modelId],
                })),
            setSelectedModels: (models) => set({ selectedModels: models }),

            modelSettings: {},
            updateModelSettings: (modelId, settings) =>
                set((s) => ({
                    modelSettings: {
                        ...s.modelSettings,
                        [modelId]: { ...(s.modelSettings[modelId] || {}), ...settings },
                    },
                })),

            concurrencyLimit: 4,
            setConcurrencyLimit: (n) => set({ concurrencyLimit: n }),
            contextMode: "shared",
            setContextMode: (mode) => set({ contextMode: mode }),
            synthesizerModel: "pollinations-openai",
            setSynthesizerModel: (model) => set({ synthesizerModel: model }),

            currentRuns: {},
            setRunStatus: (modelId, status) =>
                set((s) => ({
                    currentRuns: {
                        ...s.currentRuns,
                        [modelId]: { ...(s.currentRuns[modelId] || { modelId, output: "" }), status },
                    },
                })),
            appendToken: (modelId, text) =>
                set((s) => {
                    const existing = s.currentRuns[modelId] || { modelId, output: "", status: "streaming" as ModelStatus };
                    return {
                        currentRuns: {
                            ...s.currentRuns,
                            [modelId]: { ...existing, output: existing.output + text, status: "streaming" as ModelStatus },
                        },
                    };
                }),
            setRunUsage: (modelId, usage) =>
                set((s) => ({
                    currentRuns: {
                        ...s.currentRuns,
                        [modelId]: { ...(s.currentRuns[modelId] || { modelId, output: "" }), usage },
                    },
                })),
            setRunDone: (modelId, latencyMs, runId) =>
                set((s) => ({
                    currentRuns: {
                        ...s.currentRuns,
                        [modelId]: { ...(s.currentRuns[modelId] || { modelId, output: "" }), status: "done", latencyMs, runId },
                    },
                })),
            setRunError: (modelId, error) =>
                set((s) => ({
                    currentRuns: {
                        ...s.currentRuns,
                        [modelId]: { ...(s.currentRuns[modelId] || { modelId, output: "" }), error, status: "error" },
                    },
                })),
            setRunCitations: (modelId, citations) =>
                set((s) => ({
                    currentRuns: {
                        ...s.currentRuns,
                        [modelId]: { ...(s.currentRuns[modelId] || { modelId, output: "" }), citations },
                    },
                })),
            clearRuns: () => set({ currentRuns: {} }),
            setCurrentRuns: (runs) => set({ currentRuns: runs }),

            synthesis: null,
            isSynthesizing: false,
            setSynthesis: (text) => set({ synthesis: text }),
            setIsSynthesizing: (v) => set({ isSynthesizing: v }),

            isStreaming: false,
            setIsStreaming: (v) => set({ isStreaming: v }),
            expandedModel: null,
            setExpandedModel: (modelId) => set({ expandedModel: modelId }),
            settingsOpen: false,
            setSettingsOpen: (v) => set({ settingsOpen: v }),
            
            currentShareToken: null,
            setCurrentShareToken: (token) => set({ currentShareToken: token }),

            workflowState: {
                isExecuting: false,
                currentStep: 0,
                outputs: {},
            },
            setWorkflowExecuting: (executing) =>
                set((s) => ({ workflowState: { ...s.workflowState, isExecuting: executing } })),
            setWorkflowStep: (step) =>
                set((s) => ({ workflowState: { ...s.workflowState, currentStep: step } })),
            setWorkflowStepOutput: (step, text) =>
                set((s) => {
                    const existing = s.workflowState.outputs[step] || "";
                    return {
                        workflowState: {
                            ...s.workflowState,
                            outputs: { ...s.workflowState.outputs, [step]: existing + text },
                        },
                    };
                }),
            clearWorkflowState: () =>
                set({
                    workflowState: {
                        isExecuting: false,
                        currentStep: 0,
                        outputs: {},
                    },
                }),

            factCheckState: {
                isChecking: false,
                results: [],
            },
            setFactCheckChecking: (checking) =>
                set((s) => ({ factCheckState: { ...s.factCheckState, isChecking: checking } })),
            setFactCheckResults: (results) =>
                set((s) => ({ factCheckState: { ...s.factCheckState, results } })),
            addFactCheckResult: (claimIndex, result) =>
                set((s) => {
                    const newResults = [...s.factCheckState.results];
                    if (!newResults[claimIndex]) {
                        newResults[claimIndex] = [];
                    }
                    newResults[claimIndex].push(result);
                    return { factCheckState: { ...s.factCheckState, results: newResults } };
                }),
            clearFactCheckState: () =>
                set({
                    factCheckState: {
                        isChecking: false,
                        results: [],
                    },
                }),
        }),
        {
            name: "council-store",
            partialize: (s) => ({
                selectedModels: s.selectedModels,
                modelSettings: s.modelSettings,
                concurrencyLimit: s.concurrencyLimit,
                contextMode: s.contextMode,
                synthesizerModel: s.synthesizerModel,
            }),
        }
    )
);
