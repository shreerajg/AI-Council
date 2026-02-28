"use client";

import { useCouncilStore } from "@/store/councilStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS } from "@/lib/adapters/types";
import { CheckSquare, Square, Settings2, Minus, Plus } from "lucide-react";

const MODEL_PROVIDERS = [
    { key: "pollinations", label: "Pollinations (Free)", color: "provider-badge-openai-compat" },
    { key: "nvidia", label: "NVIDIA NIM", color: "provider-badge-openai" },
];

function hasKey(key: string): boolean {
    // This is a client component, keys are server-only
    // We show all models but warn if likely missing
    return true;
}

export function SettingsDrawer() {
    const {
        settingsOpen,
        setSettingsOpen,
        selectedModels,
        toggleModel,
        concurrencyLimit,
        setConcurrencyLimit,
        contextMode,
        setContextMode,
        synthesizerModel,
        setSynthesizerModel,
        updateModelSettings,
        modelSettings,
    } = useCouncilStore();

    const modelsByProvider = MODEL_PROVIDERS.map(({ key, label, color }) => ({
        key,
        label,
        color,
        models: AVAILABLE_MODELS.filter((m) => m.provider === key),
    }));

    return (
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetContent
                side="right"
                className="w-96 bg-card border-border overflow-y-auto"
            >
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-primary" />
                        Settings
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Model Selection */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 text-foreground">Model Selection</h3>
                        <div className="space-y-4">
                            {modelsByProvider.map(({ key, label, color, models }) => (
                                <div key={key}>
                                    <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full border inline-flex mb-2", color)}>
                                        {label}
                                    </div>
                                    <div className="space-y-1.5">
                                        {models.map((model) => {
                                            const isSelected = selectedModels.includes(model.id);
                                            return (
                                                <div
                                                    key={model.id}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all border",
                                                        isSelected
                                                            ? "bg-primary/10 border-primary/30"
                                                            : "border-border hover:bg-accent/50"
                                                    )}
                                                    onClick={() => toggleModel(model.id)}
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium truncate">{model.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">{model.description}</div>
                                                    </div>
                                                    {model.supportsCitations && (
                                                        <Badge variant="secondary" className="text-xs shrink-0">
                                                            Web
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Concurrency */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Concurrency Limit</h3>
                        <div className="flex items-center gap-3">
                            <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8"
                                onClick={() => setConcurrencyLimit(Math.max(1, concurrencyLimit - 1))}
                            >
                                <Minus className="w-3 h-3" />
                            </Button>
                            <div className="text-center w-8 font-mono font-bold">{concurrencyLimit}</div>
                            <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8"
                                onClick={() => setConcurrencyLimit(Math.min(8, concurrencyLimit + 1))}
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm text-muted-foreground">parallel models</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Context Mode */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Follow-up Context</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(["shared", "separate"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setContextMode(mode)}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-sm font-medium transition-all",
                                        contextMode === mode
                                            ? "bg-primary/10 border-primary/40 text-primary"
                                            : "border-border hover:bg-accent/50 text-muted-foreground"
                                    )}
                                >
                                    {mode === "shared" ? "Shared" : "Separate"}
                                    <div className="text-xs font-normal mt-0.5 text-muted-foreground">
                                        {mode === "shared" ? "All models see full history" : "Each model has own thread"}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Synthesizer Model */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Synthesizer Model</h3>
                        <div className="space-y-1.5">
                            {AVAILABLE_MODELS.filter((m) =>
                                ["pollinations-openai", "nvidia-llama-3-3", "nvidia-mistral-large"].includes(m.id)
                            ).map((model) => (
                                <div
                                    key={model.id}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border text-sm",
                                        synthesizerModel === model.id
                                            ? "bg-primary/10 border-primary/30 text-primary"
                                            : "border-border hover:bg-accent/50"
                                    )}
                                    onClick={() => setSynthesizerModel(model.id)}
                                >
                                    {synthesizerModel === model.id ? (
                                        <CheckSquare className="w-3.5 h-3.5" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    {model.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Privacy Note */}
                    <div className="p-3 rounded-lg bg-accent/50 border border-border text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground mb-1">🔒 Privacy Note</div>
                        Your API keys are stored server-side only and never exposed to the browser.
                        Questions and answers are stored in your local database. Content is sent to the
                        respective AI provider APIs.
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
