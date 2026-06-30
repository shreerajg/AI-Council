import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: { threadId: string } }
) {
    try {
        const { threadId } = params;
        const session = await auth();
        
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
        });

        if (!thread) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        // Allow if thread is shared or user owns it
        if (!thread.isShared && thread.userId !== session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshots = await prisma.snapshot.findMany({
            where: { threadId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(snapshots);
    } catch (error) {
        console.error("Error fetching snapshots:", error);
        return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
    }
}
