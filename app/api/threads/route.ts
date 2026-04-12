import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        
        const threads = await prisma.thread.findMany({
            where: { userId: user?.id },
            orderBy: { updatedAt: "desc" },
            include: {
                messages: { orderBy: { createdAt: "asc" }, take: 1 },
                _count: { select: { messages: true, modelRuns: true } },
            },
        });
        return NextResponse.json(threads);
    } catch (error) {
        console.error("PRISMA ERROR IN GET THREADS:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message } = await req.json();

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    const thread = await prisma.thread.create({
        data: {
            title: title || "New Thread",
            userId: user?.id,
            messages: message
                ? {
                    create: {
                        role: "user",
                        content: message,
                    },
                }
                : undefined,
        },
        include: { messages: true },
    });

    return NextResponse.json(thread, { status: 201 });
}

export async function DELETE() {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await prisma.modelRun.deleteMany({
            where: { thread: { userId: user.id } },
        });

        await prisma.message.deleteMany({
            where: { thread: { userId: user.id } },
        });

        await prisma.thread.deleteMany({
            where: { userId: user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PRISMA ERROR IN DELETE ALL THREADS:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}