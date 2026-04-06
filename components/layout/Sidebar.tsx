"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCouncilStore } from "@/store/councilStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    MessageSquarePlus,
    Search,
    Trash2,
    MessageCircle,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Thread } from "@/store/councilStore";

async function fetchThreads(): Promise<Thread[]> {
    const res = await fetch("/api/threads");
    if (!res.ok) throw new Error("Failed to fetch threads");
    return res.json();
}

async function createThread(message?: string): Promise<Thread> {
    const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: message ? message.slice(0, 60) : "New Thread", message }),
    });
    if (!res.ok) throw new Error("Failed to create thread");
    return res.json();
}

async function deleteThread(id: string): Promise<void> {
    await fetch(`/api/threads/${id}`, { method: "DELETE" });
}

export function Sidebar() {
    const {
        currentThreadId,
        setCurrentThread,
        setThreads,
        threads,
        addThread,
        removeThread,
    } = useCouncilStore();
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["threads"],
        queryFn: fetchThreads,
    });

    useEffect(() => {
        if (data) setThreads(data);
    }, [data, setThreads]);

    const createMutation = useMutation({
        mutationFn: createThread,
        onSuccess: (thread) => {
            addThread(thread);
            setCurrentThread(thread.id);
            qc.invalidateQueries({ queryKey: ["threads"] });
        },
        onError: () => toast.error("Failed to create thread"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteThread,
        onSuccess: (_, id) => {
            removeThread(id);
            if (currentThreadId === id) setCurrentThread(null);
            qc.invalidateQueries({ queryKey: ["threads"] });
        },
        onError: () => toast.error("Failed to delete thread"),
    });

    return (
        <aside className="flex flex-col h-full w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold text-lg">
                    <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        AI Council
                    </span>
                </span>
            </div>

            <Separator className="bg-border/50" />

            {/* New Thread Button */}
            <div className="p-3">
                <Button
                    className="w-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-all hover:scale-[1.02]"
                    variant="ghost"
                    onClick={() => createMutation.mutate("")}
                    disabled={createMutation.isPending}
                >
                    <MessageSquarePlus className="w-4 h-4" />
                    New Thread
                </Button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
                    <Input
                        placeholder="Search threads..."
                        className="pl-8 h-8 text-sm bg-accent/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/30"
                    />
                </div>
            </div>

            {/* Thread List */}
            <ScrollArea className="flex-1 px-2">
                {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground/60 text-sm">Loading...</div>
                ) : threads.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground/60 text-sm">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No threads yet
                    </div>
                ) : (
                    <div className="space-y-1 py-1">
                        {threads.map((thread) => (
                            <ThreadItem
                                key={thread.id}
                                thread={thread}
                                isActive={currentThreadId === thread.id}
                                onSelect={() => setCurrentThread(thread.id)}
                                onDelete={() => deleteMutation.mutate(thread.id)}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>

            <Separator className="bg-border/50" />

            {/* Footer */}
            <div className="p-3 text-xs text-muted-foreground/50 text-center">
                Multi-LLM Research Dashboard
            </div>
        </aside>
    );
}

function ThreadItem({
    thread,
    isActive,
    onSelect,
    onDelete,
}: {
    thread: Thread;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all text-sm",
                isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-accent/60 text-foreground/80"
            )}
            onClick={onSelect}
        >
            <MessageCircle className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{thread.title}</div>
                <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                </div>
            </div>
            <Button
                size="icon"
                variant="ghost"
                className="w-6 h-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                <Trash2 className="w-3 h-3" />
            </Button>
        </div>
    );
}
