"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Loader2, Sparkles, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AVAILABLE_MODELS } from "@/lib/adapters/types";

interface SharedThread {
  id: string;
  title: string;
  messages: { role: string; content: string }[];
  modelRuns: {
    id: string;
    model: string;
    output: string | null;
    error: string | null;
    isSynthesis: boolean;
    latencyMs: number | null;
    usage: string | null;
  }[];
  createdAt: string;
}

function getModelName(modelId: string): string {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  return model?.name || modelId;
}

export default function SharedThreadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [thread, setThread] = useState<SharedThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Thread not found");
        return res.json();
      })
      .then((data) => {
        setThread(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Thread not found</h1>
        <p className="text-muted-foreground">This shared thread may have been deleted or the link is invalid.</p>
      </div>
    );
  }

  if (!thread) return null;

  const userMessage = thread.messages.find((m) => m.role === "user");
  const modelResponses = thread.modelRuns.filter((r) => !r.isSynthesis && r.output);
  const synthesis = thread.modelRuns.find((r) => r.isSynthesis);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">AI Council</h1>
            <p className="text-sm text-muted-foreground">Shared conversation</p>
          </div>
        </div>

        {userMessage && (
          <div className="mb-8 flex justify-end">
            <div className="max-w-2xl px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-sm text-foreground">
              {userMessage.content}
            </div>
          </div>
        )}

        {modelResponses.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-medium text-foreground">Model Responses</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {modelResponses.map((run) => (
                <div
                  key={run.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm text-foreground">
                      {getModelName(run.model)}
                    </span>
                    {run.latencyMs && (
                      <span className="text-xs text-muted-foreground">
                        {(run.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {run.output || ""}
                    </ReactMarkdown>
                  </div>
                  {run.error && (
                    <div className="mt-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                      {run.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {synthesis && synthesis.output && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium text-foreground">Synthesis</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {synthesis.output}
              </ReactMarkdown>
            </div>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Create your own AI Council conversation
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Start New Conversation
          </Link>
        </div>
      </div>
    </div>
  );
}