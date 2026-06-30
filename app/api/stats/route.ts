import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runs = await prisma.modelRun.findMany({
        where: {
            isSynthesis: false,
            thread: { userId: session.user.id },
        },
        select: {
            model: true,
            rating: true,
            latencyMs: true,
        },
    });

    const stats: Record<string, { upvotes: number; downvotes: number; total: number; avgLatency: number; latencyCount: number }> = {};

    for (const run of runs) {
        if (!stats[run.model]) {
            stats[run.model] = { upvotes: 0, downvotes: 0, total: 0, avgLatency: 0, latencyCount: 0 };
        }
        stats[run.model].total += 1;
        if (run.rating === 1) stats[run.model].upvotes += 1;
        if (run.rating === -1) stats[run.model].downvotes += 1;
        if (run.latencyMs) {
            stats[run.model].avgLatency += run.latencyMs;
            stats[run.model].latencyCount += 1;
        }
    }

    const leaderboard = Object.entries(stats)
        .map(([model, s]) => ({
            model,
            upvotes: s.upvotes,
            downvotes: s.downvotes,
            total: s.total,
            score: s.upvotes - s.downvotes,
            avgLatencyMs: s.latencyCount > 0 ? Math.round(s.avgLatency / s.latencyCount) : null,
        }))
        .sort((a, b) => b.score - a.score);

    return NextResponse.json(leaderboard);
}
