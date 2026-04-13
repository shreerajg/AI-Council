"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCouncilStore } from "@/store/councilStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function SynthesisCard({ threadId }: { threadId: string }) {
    const {
        synthesis,
        isSynthesizing,
        setSynthesis,
        setIsSynthesizing,
        currentRuns,
        synthesizerModel,
        selectedModels,
        isStreaming,
    } = useCouncilStore();
    const [collapsed, setCollapsed] = useState(false);

    const anyDone = selectedModels.some((m) => currentRuns[m]?.status === "done");

    const handleSynthesize = async () => {
        if (!anyDone) {
            toast.error("Wait for at least one model to finish");
            return;
        }
        setIsSynthesizing(true);
        setSynthesis(null);

        try {
            const res = await fetch("/api/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId, synthesizerModel }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Synthesis failed");
            }

            const data = await res.json();
            setSynthesis(data.synthesis);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Synthesis failed");
        } finally {
            setIsSynthesizing(false);
        }
    };

    if (!anyDone && !synthesis && !isSynthesizing) {
        return null;
    }

    return (
        <div className="glass-card border-primary/20 animate-slide-up overflow-hidden hover-glow">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">AI Synthesis</span>
                    <span className="text-xs text-muted-foreground/60 px-2 py-0.5 rounded-md bg-accent/50">via {synthesizerModel}</span>
                </div>
                <div className="flex items-center gap-2">
                    {!synthesis && !isSynthesizing && anyDone && (
                        <Button
                            size="sm"
                            className="gap-1.5 h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                            variant="ghost"
                            onClick={handleSynthesize}
                            disabled={isStreaming}
                        >
                            <Sparkles className="w-3 h-3" />
                            Synthesize
                        </Button>
                    )}
                    {synthesis && (
                        <Button
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            variant="ghost"
                            onClick={handleSynthesize}
                            disabled={isSynthesizing || isStreaming}
                        >
                            <Sparkles className="w-3 h-3" />
                            Re-synthesize
                        </Button>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </Button>
                </div>
            </div>

            {/* Content */}
            {!collapsed && (
                <div className="p-4">
                    {isSynthesizing ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            Synthesizing responses...
                        </div>
                    ) : synthesis ? (
                        <ScrollArea className="max-h-64">
                            <div className="prose-council">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{synthesis}</ReactMarkdown>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            Click <strong>Synthesize</strong> to generate a combined, attributed answer
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
