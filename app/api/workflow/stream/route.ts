import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { executeWorkflow, WorkflowSSEEvent, WorkflowStep } from "@/lib/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatSSE(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return new Response(
            formatSSE("fatal_error", { error: "Unauthorized" }),
            {
                status: 401,
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            }
        );
    }

    const { searchParams } = req.nextUrl;
    const threadId = searchParams.get("threadId");
    const workflowName = searchParams.get("workflowName");
    const stepsParam = searchParams.get("steps");
    const inputParam = searchParams.get("input");

    if (!threadId || !workflowName || !stepsParam || !inputParam) {
        return new Response(
            formatSSE("fatal_error", { error: "Missing required parameters" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            }
        );
    }

    const steps: WorkflowStep[] = JSON.parse(stepsParam);

    const workflow = await prisma.workflow.create({
        data: {
            threadId,
            name: workflowName,
        },
    });

    const stepRecords: Record<number, string> = {};
    for (const step of steps) {
        const record = await prisma.workflowStep.create({
            data: {
                workflowId: workflow.id,
                stepIndex: step.stepIndex,
                type: step.type,
                modelId: step.modelId,
                prompt: step.promptTemplate,
                inputStepId: step.inputStepIds?.[0]?.toString(),
            },
        });
        stepRecords[step.stepIndex] = record.id;
    }

    const abortController = new AbortController();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const onEvent = (event: WorkflowSSEEvent) => {
                    if (abortController.signal.aborted) return;

                    switch (event.event) {
                        case "workflow_start":
                            controller.enqueue(encoder.encode(formatSSE("workflow_start", { workflowId: event.workflowId })));
                            break;
                        case "step_start":
                            controller.enqueue(encoder.encode(formatSSE("step_start", { 
                                stepIndex: event.stepIndex, 
                                type: event.type, 
                                modelId: event.modelId 
                            })));
                            break;
                        case "step_token":
                            controller.enqueue(encoder.encode(formatSSE("step_token", { 
                                stepIndex: event.stepIndex, 
                                text: event.text 
                            })));
                            break;
                        case "step_done":
                            controller.enqueue(encoder.encode(formatSSE("step_done", { 
                                stepIndex: event.stepIndex, 
                                latencyMs: event.latencyMs 
                            })));
                            if (stepRecords[event.stepIndex]) {
                                prisma.workflowStep.update({
                                    where: { id: stepRecords[event.stepIndex] },
                                    data: {
                                        output: event.output,
                                        latencyMs: event.latencyMs,
                                    },
                                }).catch(console.error);
                            }
                            break;
                        case "step_error":
                            controller.enqueue(encoder.encode(formatSSE("step_error", { 
                                stepIndex: event.stepIndex, 
                                error: event.error 
                            })));
                            if (stepRecords[event.stepIndex]) {
                                prisma.workflowStep.update({
                                    where: { id: stepRecords[event.stepIndex] },
                                    data: { error: event.error },
                                }).catch(console.error);
                            }
                            break;
                        case "workflow_complete":
                            controller.enqueue(encoder.encode(formatSSE("workflow_complete", { workflowId: event.workflowId })));
                            break;
                        case "workflow_error":
                            controller.enqueue(encoder.encode(formatSSE("workflow_error", { error: event.error })));
                            break;
                    }
                };

                await executeWorkflow({
                    workflowId: workflow.id,
                    steps,
                    initialInput: inputParam,
                    signal: abortController.signal,
                    onEvent,
                });

                controller.close();
            } catch (err) {
                console.error("WORKFLOW STREAM ERROR:", err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                controller.enqueue(encoder.encode(formatSSE("fatal_error", { error: errorMessage })));
                controller.close();
            }
        },
        cancel() {
            abortController.abort();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
