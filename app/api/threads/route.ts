import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/threads
export async function GET() {
    try {
        const threads = await prisma.thread.findMany({
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

// POST /api/threads
export async function POST(req: NextRequest) {
    const { title, message } = await req.json();

    const thread = await prisma.thread.create({
        data: {
            title: title || "New Thread",
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
