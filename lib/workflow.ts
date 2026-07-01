import pLimit from "p-limit";
import { getAdapter } from "./adapters";
import type { AdapterMessage, AdapterSettings } from "./adapters/types";

export type WorkflowStepType = "researcher" | "writer" | "critic" | "synthesizer" | "code_exec";

export interface WorkflowStep {
    stepIndex: number;
    type: WorkflowStepType;
    modelId: string;
    promptTemplate: string;
    inputStepIds?: number[];
    settings?: AdapterSettings;
}

export type WorkflowSSEEvent =
    | { event: "workflow_start"; workflowId: string }
    | { event: "step_start"; stepIndex: number; type: WorkflowStepType; modelId: string }
    | { event: "step_token"; stepIndex: number; text: string }
    | { event: "step_done"; stepIndex: number; output: string; latencyMs: number }
    | { event: "step_error"; stepIndex: number; error: string }
    | { event: "workflow_complete"; workflowId: string }
    | { event: "workflow_error"; error: string };

export interface WorkflowExecutionOptions {
    workflowId: string;
    steps: WorkflowStep[];
    initialInput: string;
    signal: AbortSignal;
    onEvent: (event: WorkflowSSEEvent) => void;
}

export interface StepOutput {
    stepIndex: number;
    output: string;
    latencyMs: number;
}

async function executeStep(
    step: WorkflowStep,
    stepOutputs: Map<number, StepOutput>,
    initialInput: string,
    signal: AbortSignal,
    onEvent: (event: WorkflowSSEEvent) => void
): Promise<string> {
    const startTime = Date.now();
    
    onEvent({
        event: "step_start",
        stepIndex: step.stepIndex,
        type: step.type,
        modelId: step.modelId,
    });

    let inputContent = initialInput;
    if (step.inputStepIds && step.inputStepIds.length > 0) {
        const inputs = step.inputStepIds
            .map((id) => {
                const prevOutput = stepOutputs.get(id);
                return prevOutput ? `[Step ${id} Output]:\n${prevOutput.output}` : "";
            })
            .filter(Boolean)
            .join("\n\n");
        inputContent = inputs || initialInput;
    }

    const finalPrompt = step.promptTemplate.replace("{{input}}", inputContent);

    const messages: AdapterMessage[] = [
        { role: "user", content: finalPrompt },
    ];

    let stepOutput = "";

    try {
        if (signal.aborted) throw new Error("Aborted");

        const adapter = getAdapter(step.modelId);
        const settings = step.settings || { temperature: 0.7, maxTokens: 2048 };

        for await (const chunk of adapter.stream(messages, settings, signal)) {
            if (signal.aborted) throw new Error("Aborted");
            
            if (chunk.type === "token") {
                stepOutput += chunk.text;
                onEvent({
                    event: "step_token",
                    stepIndex: step.stepIndex,
                    text: chunk.text,
                });
            } else if (chunk.type === "error") {
                throw new Error(chunk.error);
            }
        }

        const latencyMs = Date.now() - startTime;
        
        onEvent({
            event: "step_done",
            stepIndex: step.stepIndex,
            output: stepOutput,
            latencyMs,
        });

        return stepOutput;
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onEvent({
            event: "step_error",
            stepIndex: step.stepIndex,
            error: errorMsg,
        });
        throw err;
    }
}

export async function executeWorkflow(options: WorkflowExecutionOptions): Promise<void> {
    const { workflowId, steps, initialInput, signal, onEvent } = options;

    onEvent({ event: "workflow_start", workflowId });

    const stepOutputs = new Map<number, StepOutput>();

    try {
        const sortedSteps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);

        for (const step of sortedSteps) {
            if (signal.aborted) {
                onEvent({ event: "workflow_error", error: "Workflow aborted" });
                return;
            }

            const startTime = Date.now();
            const output = await executeStep(step, stepOutputs, initialInput, signal, onEvent);
            const latencyMs = Date.now() - startTime;

            stepOutputs.set(step.stepIndex, { stepIndex: step.stepIndex, output, latencyMs });
        }

        onEvent({ event: "workflow_complete", workflowId });
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onEvent({ event: "workflow_error", error: errorMsg });
    }
}
