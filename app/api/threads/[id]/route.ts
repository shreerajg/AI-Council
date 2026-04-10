import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

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

    if (thread.userId && thread.userId !== user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(thread);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { title, isShared } = await req.json();

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    const thread = await prisma.thread.findUnique({
        where: { id },
    });

    if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.userId && thread.userId !== user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
        updateData.title = title;
    }

    if (isShared !== undefined) {
        updateData.isShared = isShared;
        if (isShared && !thread.shareToken) {
            updateData.shareToken = crypto.randomUUID();
        } else if (!isShared) {
            updateData.shareToken = null;
        }
    }

    const updated = await prisma.thread.update({
        where: { id },
        data: updateData,
    });

    return NextResponse.json(updated);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    const thread = await prisma.thread.findUnique({
        where: { id },
    });

    if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.userId && thread.userId !== user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.thread.delete({ where: { id } });
    return NextResponse.json({ success: true });
}