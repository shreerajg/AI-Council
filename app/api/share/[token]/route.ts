import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/share/[token] - Public access to shared thread
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    
    const thread = await prisma.thread.findFirst({
        where: { 
            shareToken: token,
            isShared: true 
        },
        include: {
            messages: { orderBy: { createdAt: "asc" } },
            modelRuns: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!thread) {
        return NextResponse.json({ error: "Shared thread not found" }, { status: 404 });
    }

    return NextResponse.json(thread);
}