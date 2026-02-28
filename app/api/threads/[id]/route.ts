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
    const { title } = await req.json();

    const thread = await prisma.thread.update({
        where: { id },
        data: { title },
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
