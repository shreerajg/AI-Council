"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCouncilStore } from "@/store/councilStore";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NotionExportButtonProps {
    question: string;
}

export function NotionExportButton({ question }: NotionExportButtonProps) {
    const { currentRuns, selectedModels, synthesis } = useCouncilStore();
    const [isOpen, setIsOpen] = useState(false);
    const [databaseId, setDatabaseId] = useState(
        process.env.NEXT_PUBLIC_NOTION_DATABASE_ID || ""
    );
    const [isExporting, setIsExporting] = useState(false);
    const [exportedUrl, setExportedUrl] = useState<string | null>(null);

    const anyDone = selectedModels.some((m) => currentRuns[m]?.status === "done");

    const handleExport = async () => {
        if (!databaseId.trim()) {
            toast.error("Enter your Notion Database ID");
            return;
        }
        if (!anyDone) {
            toast.error("No completed model responses to export");
            return;
        }

        setIsExporting(true);
        setExportedUrl(null);

        const runs = selectedModels
            .map((id) => currentRuns[id])
            .filter((r) => r?.output)
            .map((r) => ({
                modelId: r.modelId,
                output: r.output,
                latencyMs: r.latencyMs,
                usage: r.usage,
            }));

        try {
            const res = await fetch("/api/export/notion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    databaseId: databaseId.trim(),
                    question,
                    runs,
                    synthesis,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Export failed");
            }

            const data = await res.json();
            setExportedUrl(data.pageUrl);
            toast.success("Exported to Notion!");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); setExportedUrl(null); }}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-8 hover-scale hover-lift"
                    disabled={!anyDone}
                >
                    <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                    >
                        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.906c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                    </svg>
                    Export to Notion
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.906c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                        </svg>
                        Export to Notion
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {exportedUrl ? (
                        <div className="text-center space-y-4">
                            <div className="text-emerald-500 font-medium">Page created successfully!</div>
                            <a
                                href={exportedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                            >
                                Open in Notion <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Notion Database ID</label>
                                <Input
                                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={databaseId}
                                    onChange={(e) => setDatabaseId(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Open your Notion database → copy the ID from the URL.<br />
                                    Set <code className="bg-muted px-1 rounded">NOTION_API_KEY</code> in <code className="bg-muted px-1 rounded">.env.local</code> to enable this feature.
                                </p>
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleExport}
                                disabled={isExporting || !databaseId.trim()}
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    "Export Now"
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
