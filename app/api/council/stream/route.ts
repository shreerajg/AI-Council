import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { orchestrate, SSEEvent } from "@/lib/orchestrator";
import type { AdapterMessage, AdapterSettings } from "@/lib/adapters/types";

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
    const modelsParam = searchParams.get("models");
    const messageParam = searchParams.get("message");
    const settingsParam = searchParams.get("settings");
    const concurrencyLimitParam = searchParams.get("concurrencyLimit");
    const contextMode = searchParams.get("contextMode") || "shared";

    if (!threadId || !modelsParam || !messageParam) {
        return new Response(
            formatSSE("fatal_error", { error: "Missing required parameters: threadId, models, message" }),
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

    const selectedModels: string[] = JSON.parse(modelsParam);
    const settingsMap: Record<string, AdapterSettings> = settingsParam
        ? JSON.parse(settingsParam)
        : {};
    const concurrencyLimit = parseInt(concurrencyLimitParam || "4", 10);

    // Load thread history
    let messages: AdapterMessage[] = [{ role: "user", content: messageParam }];
    if (contextMode === "shared") {
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: { messages: { orderBy: { createdAt: "asc" } } },
        });
        if (thread) {
            messages = thread.messages.map((m) => ({
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
            }));
            // Add current user message if not already there
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg || lastMsg.content !== messageParam || lastMsg.role !== "user") {
                messages.push({ role: "user", content: messageParam });
            }
        }
    }

    // Save user message to thread
    await prisma.message.create({
        data: { threadId, role: "user", content: messageParam },
    });
    await prisma.thread.update({
        where: { id: threadId },
        data: { title: messageParam.slice(0, 60) },
    });

    // Create model run placeholders
    const runMap: Record<string, string> = {};
    for (const modelId of selectedModels) {
        const run = await prisma.modelRun.create({
            data: {
                threadId,
                provider: modelId.split("-")[0],
                model: modelId,
                settingsSnap: JSON.stringify(settingsMap[modelId] || {}),
            },
        });
        runMap[modelId] = run.id;
    }

    const abortController = new AbortController();
    const outputBuffers: Record<string, string> = {};
    const startTimes: Record<string, number> = {};

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const onEvent = (event: SSEEvent) => {
                    if (abortController.signal.aborted) return;
                    switch (event.event) {
                        case "start":
                            startTimes[event.modelId] = Date.now();
                            outputBuffers[event.modelId] = "";
                            controller.enqueue(encoder.encode(formatSSE("start", { modelId: event.modelId })));
                            break;
                        case "token":
                            outputBuffers[event.modelId] = (outputBuffers[event.modelId] || "") + event.text;
                            controller.enqueue(encoder.encode(formatSSE("token", { modelId: event.modelId, text: event.text })));
                            break;
                        case "citation":
                            controller.enqueue(encoder.encode(formatSSE("citation", { modelId: event.modelId, citations: event.citations })));
                            break;
                        case "usage":
                            controller.enqueue(encoder.encode(formatSSE("usage", { modelId: event.modelId, usage: event.usage })));
                            // Persist usage
                            if (runMap[event.modelId]) {
                                prisma.modelRun.update({
                                    where: { id: runMap[event.modelId] },
                                    data: { usage: JSON.stringify(event.usage) },
                                }).catch(console.error);
                            }
                            break;
                        case "done":
                            controller.enqueue(encoder.encode(formatSSE("done", { modelId: event.modelId, latencyMs: event.latencyMs })));
                            // Persist output
                            if (runMap[event.modelId]) {
                                prisma.modelRun.update({
                                    where: { id: runMap[event.modelId] },
                                    data: {
                                        output: outputBuffers[event.modelId] || "",
                                        latencyMs: event.latencyMs,
                                        finishReason: "stop",
                                    },
                                }).catch(console.error);
                            }
                            break;
                        case "model_error":
                            controller.enqueue(encoder.encode(formatSSE("model_error", { modelId: event.modelId, error: event.error })));
                            if (runMap[event.modelId]) {
                                prisma.modelRun.update({
                                    where: { id: runMap[event.modelId] },
                                    data: { error: event.error },
                                }).catch(console.error);
                            }
                            break;
                    }
                };

                await orchestrate({
                    messages,
                    selectedModels,
                    settings: settingsMap,
                    concurrencyLimit,
                    signal: abortController.signal,
                    onEvent,
                });

                controller.enqueue(encoder.encode(formatSSE("complete", { models: selectedModels })));
                controller.close();
            } catch (err) {
                console.error("STREAM ERROR ROUTE:", err);
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
