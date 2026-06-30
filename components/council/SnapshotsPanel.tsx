"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Camera, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useCouncilStore } from "@/store/councilStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Snapshot {
    id: string;
    name: string;
    responses: string;
    createdAt: string;
}

export function SnapshotsPanel({ threadId }: { threadId: string }) {
    const { currentRuns, selectedModels } = useCouncilStore();
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [viewSnapshot, setViewSnapshot] = useState<Snapshot | null>(null);

    const { data: snapshots = [], isLoading } = useQuery({
        queryKey: ["snapshots", threadId],
        queryFn: async () => {
            const res = await fetch(`/api/snapshots/${threadId}`);
            if (!res.ok) throw new Error("Failed to load snapshots");
            return res.json() as Promise<Snapshot[]>;
        },
        enabled: !!threadId,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const responses: Record<string, string> = {};
            selectedModels.forEach(modelId => {
                if (currentRuns[modelId]?.output) {
                    responses[modelId] = currentRuns[modelId].output;
                }
            });

            if (Object.keys(responses).length === 0) {
                throw new Error("No responses to save");
            }

            const res = await fetch("/api/snapshots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threadId, name, responses }),
            });

            if (!res.ok) throw new Error("Failed to save snapshot");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Snapshot saved");
            setIsOpen(false);
            setName("");
            qc.invalidateQueries({ queryKey: ["snapshots", threadId] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Failed to save snapshot");
        }
    });

    return (
        <div className="flex gap-2">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs hover-scale hover-lift">
                        <Camera className="w-3.5 h-3.5" />
                        Save Snapshot
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Current Responses</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input 
                            placeholder="Snapshot Name (e.g. Round 1, Best Answers)" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                        />
                        <Button 
                            className="w-full" 
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                        >
                            Save Snapshot
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {snapshots.length > 0 && (
                <Dialog open={!!viewSnapshot} onOpenChange={(open) => !open && setViewSnapshot(null)}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs hover-scale hover-lift">
                            <Bookmark className="w-3.5 h-3.5" />
                            {snapshots.length} Snapshots
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>
                                {viewSnapshot ? viewSnapshot.name : "Saved Snapshots"}
                            </DialogTitle>
                        </DialogHeader>
                        
                        {!viewSnapshot ? (
                            <div className="flex flex-col gap-2 py-4">
                                {snapshots.map((s) => (
                                    <div 
                                        key={s.id} 
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => setViewSnapshot(s)}
                                    >
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(s.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-6 p-1">
                                <Button variant="ghost" size="sm" onClick={() => setViewSnapshot(null)} className="mb-4">
                                    &larr; Back to list
                                </Button>
                                {Object.entries(JSON.parse(viewSnapshot.responses)).map(([modelId, content]) => (
                                    <div key={modelId} className="border rounded-xl p-4">
                                        <h3 className="font-semibold text-sm mb-3 text-primary">{modelId}</h3>
                                        <div className="prose-council">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {content as string}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
