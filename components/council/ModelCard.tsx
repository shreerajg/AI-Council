"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCouncilStore } from "@/store/councilStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Copy,
    Maximize2,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Clock,
    Zap,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PROVIDER_COLORS: Record<string, string> = {
    pollinations: "provider-badge-openai-compat",
    openai: "provider-badge-openai",
    gemini: "provider-badge-gemini",
    "openai-compat": "provider-badge-openai-compat",
    nvidia: "provider-badge-openai",
};

const PROVIDER_LABELS: Record<string, string> = {
    pollinations: "Pollinations",
    openai: "OpenAI",
    gemini: "Google",
    "openai-compat": "Custom",
    nvidia: "NVIDIA NIM",
};

const MODEL_SHORT_NAMES: Record<string, string> = {
    "pollinations-openai": "GPT-4o (Free)",
    "nvidia-llama-3-3": "Llama 3.3",
    "nvidia-mistral-large": "Mistral Large",
};

function getProvider(modelId: string): string {
    if (modelId.startsWith("pollinations-")) return "pollinations";
    if (modelId.startsWith("nvidia-")) return "nvidia";
    return "openai-compat";
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "queued":
            return (
                <Badge variant="secondary" className="text-xs gap-1">
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }}
                            />
                        ))}
                    </div>
                    Queued
                </Badge>
            );
        case "streaming":
            return (
                <Badge className="text-xs gap-1 bg-primary/20 text-primary border border-primary/30">
                    <Zap className="w-3 h-3 animate-pulse" /> Streaming
                </Badge>
            );
        case "done":
            return (
                <Badge className="text-xs gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 animate-dot-burst" /> Done
                </Badge>
            );
        case "error":
            return (
                <Badge className="text-xs gap-1 bg-red-500/20 text-red-400 border border-red-500/30">
                    <AlertCircle className="w-3 h-3" /> Error
                </Badge>
            );
        default:
            return null;
    }
}

interface ModelCardProps {
    modelId: string;
    onRegenerate?: () => void;
}

export function ModelCard({ modelId, onRegenerate }: ModelCardProps) {
    const { currentRuns, setExpandedModel } = useCouncilStore();
    const run = currentRuns[modelId];
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll removed due to severe performance degradation during multi-model parallel Markdown rendering.
    // CSS overflow-anchor will naturally try to keep position if scrolled to bottom.

    const provider = getProvider(modelId);
    const providerClass = PROVIDER_COLORS[provider] || "";
    const shortName = MODEL_SHORT_NAMES[modelId] || modelId;
    const providerLabel = PROVIDER_LABELS[provider] || provider;

    const handleCopy = async () => {
        if (!run?.output) return;
        await navigator.clipboard.writeText(run.output);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const costEstimate = run?.usage
        ? ((run.usage.promptTokens * 0.000001 + run.usage.completionTokens * 0.000003) * 1000).toFixed(3)
        : null;

    return (
        <div
            className={cn(
                "glass-card flex flex-col h-[500px] animate-slide-up transition-all card-hover-lift",
                run?.status === "streaming" && "animate-pulse-glow",
                run?.status === "error" && "border-red-500/30"
            )}
        >
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 group">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-2 h-2 rounded-full", 
                        run?.status === "done" && "bg-emerald-500",
                        run?.status === "streaming" && "bg-primary animate-pulse",
                        run?.status === "error" && "bg-red-500",
                        run?.status === "queued" && "bg-amber-500 animate-pulse",
                        !run || run.status === "idle" && "bg-muted-foreground/30"
                    )} />
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg border", providerClass)}>
                        {providerLabel}
                    </span>
                    <span className="font-semibold text-sm truncate text-foreground">{shortName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={run?.status || "idle"} />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="w-7 h-7 hover:bg-accent hover:scale-110 transition-all duration-200"
                                onClick={handleCopy}
                                disabled={!run?.output}
                            >
                                {copied ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-dot-burst" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy response</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="w-7 h-7 hover:bg-accent"
                                onClick={() => setExpandedModel(modelId)}
                                disabled={!run?.output}
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Expand</TooltipContent>
                    </Tooltip>
                    {onRegenerate && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="w-7 h-7 hover:bg-accent"
                                    onClick={onRegenerate}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Card Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0 relative scroll-smooth">
                {!run || run.status === "idle" ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-xl bg-accent/50 border border-border animate-pulse" />
                            <p className="text-muted-foreground/60 text-sm">Waiting for response...</p>
                        </div>
                    </div>
                ) : run.status === "queued" ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                            <div className="flex gap-2 justify-center">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                            <p className="text-muted-foreground/80 text-sm">In queue...</p>
                        </div>
                    </div>
                ) : run.status === "error" ? (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mb-1" />
                        {run.error || "An error occurred"}
                    </div>
                ) : (
                    <div
                        className={cn(
                            "prose-council",
                            run.status === "streaming" && "streaming-cursor"
                        )}
                    >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {run.output || ""}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* Citations */}
            {run?.citations && run.citations.length > 0 && (
                <div className="px-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1.5 font-medium">Sources</div>
                    <div className="flex flex-wrap gap-1.5">
                        {run.citations.slice(0, 5).map((c, i) => (
                            <a
                                key={i}
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent border border-border hover:border-primary/40 transition-colors text-foreground/70 hover:text-foreground"
                            >
                                <ExternalLink className="w-2.5 h-2.5" />
                                {c.title || `Source ${i + 1}`}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Metadata */}
            {(run?.latencyMs || run?.usage) && (
                <div className="px-4 pb-3 pt-1 flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 mt-auto">
                    {run.latencyMs && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {(run.latencyMs / 1000).toFixed(1)}s
                        </span>
                    )}
                    {run.usage && (
                        <span>
                            {run.usage.totalTokens.toLocaleString()} tokens
                        </span>
                    )}
                    {costEstimate && (
                        <span>≈${costEstimate}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// Expanded Model Dialog
export function ExpandedModelDialog() {
    const { expandedModel, setExpandedModel, currentRuns } = useCouncilStore();
    const run = expandedModel ? currentRuns[expandedModel] : null;
    const shortName = expandedModel ? (MODEL_SHORT_NAMES[expandedModel] || expandedModel) : "";

    return (
        <Dialog open={!!expandedModel} onOpenChange={() => setExpandedModel(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-lg">{shortName}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                    <div className="prose-council p-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {run?.output || "No content"}
                        </ReactMarkdown>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
