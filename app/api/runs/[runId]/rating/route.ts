import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { runId: string } }
) {
    try {
        const { runId } = params;
        const session = await auth();

        // Ensure user is authenticated to vote
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { rating } = await req.json();

        // Validate rating (-1, 0, 1) where 0 is neutral/removed vote
        if (![1, -1, 0].includes(rating)) {
            return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
        }

        const run = await prisma.modelRun.findUnique({
            where: { id: runId },
            include: { thread: true },
        });

        if (!run) {
            return NextResponse.json({ error: "Run not found" }, { status: 404 });
        }

        // Only thread owner can rate
        if (run.thread.userId && run.thread.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const updated = await prisma.modelRun.update({
            where: { id: runId },
            data: { rating: rating === 0 ? null : rating },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Failed to update rating:", error);
        return NextResponse.json({ error: "Failed to update rating" }, { status: 500 });
    }
}
