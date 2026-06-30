import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { threadId, name, responses } = await req.json();

        if (!threadId || !responses) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
        });

        if (!thread) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }
        
        if (thread.userId && thread.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await prisma.snapshot.create({
            data: {
                threadId,
                name: name || "Saved Snapshot",
                responses: JSON.stringify(responses)
            }
        });

        return NextResponse.json(snapshot);
    } catch (error) {
        console.error("Error saving snapshot:", error);
        return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
    }
}
