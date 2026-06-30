"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCouncilStore } from "@/store/councilStore";
import { Swords, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DebateModeButton({ threadId }: { threadId: string }) {
    const { currentRuns, selectedModels, synthesizerModel } = useCouncilStore();
    const [isDebating, setIsDebating] = useState(false);
    const [debateOutput, setDebateOutput] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const anyDone = selectedModels.some((m) => currentRuns[m]?.status === "done");

    const handleDebate = async () => {
        if (!anyDone) {
            toast.error("Wait for models to finish before debating");
            return;
        }

        const responses: Record<string, string> = {};
        selectedModels.forEach(modelId => {
            if (currentRuns[modelId]?.output) {
                responses[modelId] = currentRuns[modelId].output;
            }
        });

        setIsDebating(true);
        setDebateOutput(null);

        try {
            const res = await fetch("/api/debate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    threadId, 
                    debaterModel: synthesizerModel, // Use the same configured synthesis model to run the debate
                    responses 
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Debate failed");
            }

            const data = await res.json();
            setDebateOutput(data.debateOutput);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Debate failed");
        } finally {
            setIsDebating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 h-8 text-xs hover-scale hover-lift text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                    disabled={!anyDone}
                >
                    <Swords className="w-3.5 h-3.5" />
                    Model Debate
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-amber-500" /> 
                        Model Debate Critique
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {!debateOutput && !isDebating ? (
                        <div className="text-center space-y-4 py-8">
                            <p className="text-muted-foreground">
                                Trigger a critical review where a model ({synthesizerModel}) evaluates the differences, flaws, and agreements between the current answers.
                            </p>
                            <Button onClick={handleDebate} className="bg-amber-500 hover:bg-amber-600 text-white">
                                Start Debate Round
                            </Button>
                        </div>
                    ) : isDebating ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-amber-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p>Analyzing and critiquing model responses...</p>
                        </div>
                    ) : (
                        <div className="prose-council">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {debateOutput || ""}
                            </ReactMarkdown>
                            <div className="mt-8 flex justify-center">
                                <Button variant="outline" onClick={handleDebate} className="gap-2">
                                    <Swords className="w-4 h-4" /> Run Another Debate
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
