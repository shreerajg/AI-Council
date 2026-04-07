"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCouncilStore, type ModelRun } from "@/store/councilStore";
import { AVAILABLE_MODELS } from "@/lib/adapters/types";
import { CouncilGrid } from "@/components/council/CouncilGrid";
import { SynthesisCard } from "@/components/council/SynthesisCard";
import { ExpandedModelDialog } from "@/components/council/ModelCard";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCouncilStream } from "@/hooks/useCouncilStream";
import { generateMarkdownExport, downloadMarkdown } from "@/lib/export";
import { toast } from "sonner";
import {
  Send,
  Square,
  Settings,
  FileText,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Share,
  Link,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

async function createThread(message: string) {
  const res = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: message.slice(0, 60), message }),
  });
  if (!res.ok) throw new Error("Failed to create thread");
  return res.json();
}

async function updateThreadShare(threadId: string, isShared: boolean) {
  const res = await fetch(`/api/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isShared }),
  });
  if (!res.ok) throw new Error("Failed to update thread share");
  return res.json();
}

export default function HomePage() {
  const {
    currentThreadId,
    setCurrentThread,
    addThread,
    isStreaming,
    setIsStreaming,
    setSettingsOpen,
    selectedModels,
    setSelectedModels,
    currentRuns,
    setCurrentRuns,
    synthesis,
    setSynthesis,
    currentShareToken,
    setCurrentShareToken,
  } = useCouncilStore();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastQuestion, setLastQuestion] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { startStream, stopStream } = useCouncilStream();

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Sanitize persistent localStorage to prevent obsolete model crashes
  useEffect(() => {
    const validModelIds = new Set(AVAILABLE_MODELS.map((m) => m.id));
    const cleanModels = selectedModels.filter((id) => validModelIds.has(id));
    if (cleanModels.length !== selectedModels.length) {
      setSelectedModels(cleanModels);
    }
  }, [selectedModels, setSelectedModels]);

  // Load historical thread runs when currentThreadId changes
  useEffect(() => {
    if (!currentThreadId) return;
    if (isStreaming) return;

    let mounted = true;
    const fetchThread = async () => {
      try {
        const res = await fetch(`/api/threads/${currentThreadId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        // Set the question if it exists in messages
        const userMsg = data.messages?.filter((m: { role: string }) => m.role === "user").pop();
        if (userMsg) {
          setLastQuestion(userMsg.content);
        }

        // Parse runs
        const loadedRuns: Record<string, ModelRun> = {};
        for (const r of data.modelRuns || []) {
          if (r.isSynthesis) {
            setSynthesis(r.output);
            continue;
          }
          loadedRuns[r.model] = {
            modelId: r.model,
            status: r.error ? "error" : (r.finishReason ? "done" : "idle"),
            output: r.output || "",
            error: r.error || undefined,
            latencyMs: r.latencyMs || undefined,
            usage: r.usage ? JSON.parse(r.usage) : undefined,
            citations: r.citations ? JSON.parse(r.citations) : undefined,
          };
        }

        setCurrentRuns(loadedRuns);
      } catch (err) {
        console.error("Failed to fetch historical runs", err);
      }
    };

    fetchThread();
    return () => { mounted = false; };
  }, [currentThreadId, setCurrentRuns, setSynthesis, isStreaming]);

  const createMutation = useMutation({
    mutationFn: createThread,
    onSuccess: (thread) => {
      addThread(thread);
      setCurrentThread(thread.id);
      qc.invalidateQueries({ queryKey: ["threads"] });
      return thread;
    },
  });

  const handleSubmit = useCallback(async () => {
    const message = input.trim();
    if (!message || isStreaming) return;
    if (selectedModels.length === 0) {
      toast.error("Select at least one model in Settings");
      setSettingsOpen(true);
      return;
    }

    setLastQuestion(message);
    setInput("");

    try {
      let threadId = currentThreadId;
      if (!threadId) {
        const thread = await createMutation.mutateAsync(message);
        threadId = thread.id;
      }
      await startStream(message, threadId!);
    } catch {
      toast.error("Failed to start stream");
      setIsStreaming(false);
    }
  }, [input, isStreaming, selectedModels, currentThreadId, createMutation, startStream, setSettingsOpen, setIsStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExportMarkdown = () => {
    const runs = selectedModels
      .map((id) => currentRuns[id])
      .filter((r) => r?.output)
      .map((r) => ({
        modelId: r.modelId,
        output: r.output,
        latencyMs: r.latencyMs,
        usage: r.usage,
      }));

    if (runs.length === 0) {
      toast.error("No responses to export yet");
      return;
    }

    const md = generateMarkdownExport(lastQuestion, runs, synthesis);
    downloadMarkdown(md, `ai-council-${Date.now()}.md`);
    toast.success("Exported to Markdown");
  };

  const anyDone = selectedModels.some((m) => currentRuns[m]?.status === "done");

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 shrink-0 sticky top-0 h-screen",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        <Sidebar />
      </div>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""} selected
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>
                {selectedModels.slice(0, 3).join(", ")}
                {selectedModels.length > 3 && ` +${selectedModels.length - 3}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {anyDone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs h-8"
                    onClick={handleExportMarkdown}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Export MD
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export to Markdown</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings & Model Selection</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full" id="council-content" ref={gridRef}>
          {/* Empty State */}
          {!isStreaming && Object.keys(currentRuns).length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center animate-pulse-glow">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">AI Council</h1>
                <p className="text-muted-foreground max-w-md leading-relaxed">
                  Ask one question, receive parallel answers from multiple AI models.
                  Compare perspectives from GPT-4, Gemini, Claude, and more.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 bg-card/50 px-4 py-2 rounded-full border border-border/50">
                <kbd className="px-2.5 py-1 rounded-md border border-border bg-accent font-mono text-foreground shadow-sm">
                  Ctrl
                </kbd>
                <span className="text-muted-foreground/60">+</span>
                <kbd className="px-2.5 py-1 rounded-md border border-border bg-accent font-mono text-foreground shadow-sm">
                  K
                </kbd>
                <span className="text-muted-foreground/60">to focus</span>
              </div>
            </div>
          )}

          {/* Question Display */}
          {lastQuestion && (
            <div className="flex justify-end animate-fade-in">
              <div className="max-w-2xl px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-sm text-foreground">
                {lastQuestion}
              </div>
            </div>
          )}

          {/* Council Grid */}
          {Object.keys(currentRuns).length > 0 && (
            <div className="animate-fade-in">
              <CouncilGrid />
            </div>
          )}

          {/* Synthesis */}
          {currentThreadId && anyDone && (
            <SynthesisCard threadId={currentThreadId} />
          )}
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 border-t border-border/50 bg-background/60 backdrop-blur-xl p-4 mt-auto">
          <div className="max-w-4xl mx-auto">
            <div
              className={cn(
                "flex gap-3 items-end p-2 rounded-2xl border transition-all duration-300",
                isStreaming
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border/80 bg-card/80 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isStreaming
                      ? "Waiting for models to respond..."
                      : `Ask all ${selectedModels.length} models…`
                  }
                  disabled={isStreaming}
                  className="flex-1 resize-none min-h-[44px] max-h-[160px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60 pl-2"
                  rows={1}
                />
              </div>
              <div className="flex gap-1.5 pb-1 pr-1">
                {isStreaming ? (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="w-9 h-9 shrink-0 rounded-xl transition-all hover:scale-105"
                    onClick={stopStream}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-105 shadow-lg shadow-primary/25"
                    onClick={handleSubmit}
                    disabled={!input.trim() || selectedModels.length === 0}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2 text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-muted/50 text-[10px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-muted/50 text-[10px]">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </main>

      {/* Modals & Drawers */}
      <SettingsDrawer />
      <ExpandedModelDialog />
    </div>
  );
}
