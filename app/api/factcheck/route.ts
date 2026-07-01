import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { factCheck, FactCheckSSEEvent } from "@/lib/factcheck";

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
    const claimsParam = searchParams.get("claims");
    const checkersParam = searchParams.get("checkers");
    const modelRunId = searchParams.get("modelRunId");

    if (!threadId || !claimsParam || !checkersParam) {
        return new Response(
            formatSSE("fatal_error", { error: "Missing required parameters: threadId, claims, checkers" }),
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

    const claims: string[] = JSON.parse(claimsParam);
    const checkers: string[] = JSON.parse(checkersParam);

    const abortController = new AbortController();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                let factCheckId: string | null = null;
                const allResults: any[] = [];

                const onEvent = (event: FactCheckSSEEvent) => {
                    if (abortController.signal.aborted) return;

                    switch (event.event) {
                        case "factcheck_start":
                            controller.enqueue(encoder.encode(formatSSE("factcheck_start", { totalClaims: event.totalClaims })));
                            break;
                        case "claim_start":
                            controller.enqueue(encoder.encode(formatSSE("claim_start", { 
                                claimIndex: event.claimIndex, 
                                claim: event.claim 
                            })));
                            break;
                        case "checking":
                            controller.enqueue(encoder.encode(formatSSE("checking", { 
                                claimIndex: event.claimIndex, 
                                checkerModel: event.checkerModel 
                            })));
                            break;
                        case "check_result":
                            controller.enqueue(encoder.encode(formatSSE("check_result", { 
                                claimIndex: event.claimIndex, 
                                checkerModel: event.checkerModel, 
                                result: event.result 
                            })));
                            break;
                        case "claim_complete":
                            controller.enqueue(encoder.encode(formatSSE("claim_complete", { 
                                claimIndex: event.claimIndex, 
                                results: event.results 
                            })));
                            break;
                        case "factcheck_complete":
                            allResults.push(...event.allResults);
                            
                            const totalChecks = event.allResults.flat().length;
                            const trueCount = event.allResults.flat().filter(r => r.verdict === "true").length;
                            const avgConfidence = event.allResults.flat().reduce((sum, r) => sum + r.confidence, 0) / totalChecks;
                            const overallVerified = trueCount / totalChecks > 0.6;

                            prisma.factCheck.create({
                                data: {
                                    threadId,
                                    modelRunId: modelRunId || undefined,
                                    claim: claims[0],
                                    checkers: JSON.stringify(checkers),
                                    results: JSON.stringify(event.allResults),
                                    confidence: avgConfidence,
                                    isVerified: overallVerified,
                                },
                            }).then(record => {
                                factCheckId = record.id;
                                controller.enqueue(encoder.encode(formatSSE("factcheck_complete", { 
                                    factCheckId: record.id,
                                    allResults: event.allResults,
                                    confidence: avgConfidence,
                                    isVerified: overallVerified
                                })));
                            }).catch(console.error);
                            break;
                        case "factcheck_error":
                            controller.enqueue(encoder.encode(formatSSE("factcheck_error", { error: event.error })));
                            break;
                    }
                };

                await factCheck({
                    claims,
                    checkerModels: checkers,
                    signal: abortController.signal,
                    onEvent,
                });

                controller.close();
            } catch (err) {
                console.error("FACTCHECK STREAM ERROR:", err);
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
