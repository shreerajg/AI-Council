import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAdapter } from "@/lib/adapters";
import type { AdapterMessage } from "@/lib/adapters/types";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, responses, debaterModel, instructions } = await req.json();

    if (!threadId || !debaterModel || !responses) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: {
                messages: { orderBy: { createdAt: "asc" } },
            },
        });

        if (!thread) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        if (thread.userId && thread.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userMessage = thread.messages.find((m) => m.role === "user")?.content || "";
        
        let debatePrompt = `You are participating in a Model Debate. The user asked the following question:
        
**Question:** ${userMessage}

Other AI models have provided the following answers:

`;

        for (const [modelId, response] of Object.entries(responses)) {
            debatePrompt += `**Model (${modelId}) answered:**\n${response}\n\n`;
        }

        debatePrompt += `Your task is to review these answers critically. 
${instructions || "Find flaws in their reasoning, point out any factual errors, and propose a better or more robust solution that resolves their disagreements."}

Structure your response to clearly address specific models when critiquing their points.`;

        const messages: AdapterMessage[] = [
            { role: "user", content: debatePrompt },
        ];

        const controller = new AbortController();
        let debateOutput = "";

        const adapter = getAdapter(debaterModel);
        
        // This won't stream to the client directly via SSE, we'll just wait for the full response for simplicity in this endpoint,
        // or we could integrate it into the streaming architecture. For now, we will collect it and return it.
        for await (const chunk of adapter.stream(messages, { temperature: 0.7, maxTokens: 4000 }, controller.signal)) {
            if (chunk.type === "token") {
                debateOutput += chunk.text;
            }
        }
        
        // Save debate run
        const run = await prisma.modelRun.create({
            data: {
                threadId,
                provider: debaterModel.split("-")[0],
                model: debaterModel,
                settingsSnap: JSON.stringify({ isDebate: true }),
                output: debateOutput,
                isSynthesis: false, // We'll treat it as a regular run but with special content
            },
        });

        return NextResponse.json({ debateOutput, runId: run.id });
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}
