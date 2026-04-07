import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/threads/[id]
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const thread = await prisma.thread.findUnique({
        where: { id },
        include: {
            messages: { orderBy: { createdAt: "asc" } },
            modelRuns: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(thread);
}

// PATCH /api/threads/[id]
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { title, isShared } = await req.json();

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
        updateData.title = title;
    }

    if (isShared !== undefined) {
        updateData.isShared = isShared;
        if (isShared && !updateData.shareToken) {
            updateData.shareToken = crypto.randomUUID();
        } else if (!isShared) {
            updateData.shareToken = null;
        }
    }

    const thread = await prisma.thread.update({
        where: { id },
        data: updateData,
    });

    return NextResponse.json(thread);
}

// DELETE /api/threads/[id]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.thread.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
