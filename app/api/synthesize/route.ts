import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAdapter } from "@/lib/adapters";
import type { AdapterMessage } from "@/lib/adapters/types";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, synthesizerModel } = await req.json();

    if (!threadId || !synthesizerModel) {
        return NextResponse.json({ error: "Missing threadId or synthesizerModel" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
            messages: { orderBy: { createdAt: "asc" } },
            modelRuns: { where: { isSynthesis: false, error: null }, orderBy: { createdAt: "asc" } },
        },
    });

    if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.userId && thread.userId !== user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userMessage = thread.messages.find((m) => m.role === "user")?.content || "";
    const modelOutputs = thread.modelRuns
        .filter((r) => r.output)
        .map((r) => `**${r.model}** says:\n${r.output}`)
        .join("\n\n---\n\n");

    if (!modelOutputs) {
        return NextResponse.json({ error: "No model outputs to synthesize" }, { status: 400 });
    }

    const synthesisPrompt = `You are a synthesis AI. Multiple AI models have answered the following question:

**Question:** ${userMessage}

Here are their responses:

${modelOutputs}

Please create a comprehensive synthesis that:
1. Identifies common themes and areas of agreement (cite which models agree)
2. Highlights unique insights from specific models (e.g., "Claude notes...", "GPT-4o suggests...", "Gemini points out...")
3. Notes any contradictions or differing perspectives
4. Provides a balanced, integrated conclusion

Format your synthesis clearly with sections. Use model names (e.g., "pollinations-claude", "pollinations-openai", "pollinations-mistral") when attributing specific points.`;

    const messages: AdapterMessage[] = [
        { role: "user", content: synthesisPrompt },
    ];

    const controller = new AbortController();
    let synthesisText = "";

    try {
        const adapter = getAdapter(synthesizerModel);
        for await (const chunk of adapter.stream(messages, { temperature: 0.3, maxTokens: 3000 }, controller.signal)) {
            if (chunk.type === "token") {
                synthesisText += chunk.text;
            }
        }
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const run = await prisma.modelRun.create({
        data: {
            threadId,
            provider: synthesizerModel.split("-")[0],
            model: synthesizerModel,
            settingsSnap: JSON.stringify({}),
            output: synthesisText,
            isSynthesis: true,
        },
    });

    return NextResponse.json({ synthesis: synthesisText, runId: run.id });
}