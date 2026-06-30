"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelStat {
    model: string;
    upvotes: number;
    downvotes: number;
    total: number;
    score: number;
    avgLatencyMs: number | null;
}

export function LeaderboardButton() {
    const [open, setOpen] = useState(false);

    const { data: leaderboard = [], isLoading } = useQuery<ModelStat[]>({
        queryKey: ["stats"],
        queryFn: async () => {
            const res = await fetch("/api/stats");
            if (!res.ok) throw new Error("Failed to load stats");
            return res.json();
        },
        enabled: open,
    });

    const medals = ["🥇", "🥈", "🥉"];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs hover-scale hover-lift text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10">
                    <Trophy className="w-3.5 h-3.5" />
                    Leaderboard
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Model Leaderboard
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">Loading stats...</div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No votes yet. Upvote or downvote model responses to build the leaderboard.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((entry, i) => (
                                <div
                                    key={entry.model}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                        i === 0
                                            ? "bg-yellow-500/10 border-yellow-500/30"
                                            : "border-border/60 bg-accent/20"
                                    )}
                                >
                                    <span className="text-xl w-7 text-center shrink-0">
                                        {medals[i] ?? `#${i + 1}`}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{entry.model}</div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            <span className="flex items-center gap-1 text-emerald-500">
                                                <ThumbsUp className="w-3 h-3" />{entry.upvotes}
                                            </span>
                                            <span className="flex items-center gap-1 text-red-500">
                                                <ThumbsDown className="w-3 h-3" />{entry.downvotes}
                                            </span>
                                            <span>{entry.total} runs</span>
                                            {entry.avgLatencyMs && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {(entry.avgLatencyMs / 1000).toFixed(1)}s avg
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "font-bold text-sm shrink-0",
                                        entry.score > 0 ? "text-emerald-500" : entry.score < 0 ? "text-red-500" : "text-muted-foreground"
                                    )}>
                                        {entry.score > 0 ? "+" : ""}{entry.score}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
