"use client";

import { useCouncilStore } from "@/store/councilStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS } from "@/lib/adapters/types";
import { CheckSquare, Settings2, Minus, Plus } from "lucide-react";

const MODEL_PROVIDERS = [
    { key: "pollinations", label: "Pollinations (Free)", color: "provider-badge-openai-compat" },
    { key: "nvidia", label: "NVIDIA NIM", color: "provider-badge-openai" },
];

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
                className="w-96 bg-card/95 backdrop-blur-xl border-border/50 overflow-y-auto"
            >
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Settings2 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold">Settings</span>
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Model Selection */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-primary" />
                            Model Selection
                        </h3>
                        <div className="space-y-4">
                            {modelsByProvider.map(({ key, label, color, models }) => (
                                <div key={key}>
                                    <div className={cn("text-xs font-medium px-2.5 py-1 rounded-lg border inline-flex mb-2.5", color)}>
                                        {label}
                                    </div>
                                    <div className="space-y-1.5">
                                        {models.map((model) => {
                                            const isSelected = selectedModels.includes(model.id);
                                            return (
                                                <div
                                                    key={model.id}
                                                    className={cn(
                                                        "flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all border",
                                                        isSelected
                                                            ? "bg-primary/10 border-primary/30 shadow-sm shadow-primary/5"
                                                            : "border-border/60 hover:bg-accent/40 hover:border-border"
                                                    )}
                                                    onClick={() => toggleModel(model.id)}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                                                    )}>
                                                        {isSelected && <CheckSquare className="w-3 h-3 text-primary-foreground" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium truncate">{model.name}</div>
                                                        <div className="text-xs text-muted-foreground/60 truncate">{model.description}</div>
                                                    </div>
                                                    {model.supportsCitations && (
                                                        <Badge variant="secondary" className="text-xs shrink-0 bg-amber-500/10 text-amber-500 border-amber-500/20">
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

                    <Separator className="bg-border/50" />

                    {/* Concurrency */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-primary" />
                            Concurrency Limit
                        </h3>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/50">
                            <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8 hover:bg-primary/10 hover:border-primary/30"
                                onClick={() => setConcurrencyLimit(Math.max(1, concurrencyLimit - 1))}
                            >
                                <Minus className="w-3 h-3" />
                            </Button>
                            <div className="text-center w-8 font-mono font-bold text-primary">{concurrencyLimit}</div>
                            <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8 hover:bg-primary/10 hover:border-primary/30"
                                onClick={() => setConcurrencyLimit(Math.min(8, concurrencyLimit + 1))}
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm text-muted-foreground">parallel models</span>
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Context Mode */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-primary" />
                            Follow-up Context
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(["shared", "separate"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setContextMode(mode)}
                                    className={cn(
                                        "p-3 rounded-xl border text-sm font-medium transition-all text-left",
                                        contextMode === mode
                                            ? "bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/5"
                                            : "border-border/60 hover:bg-accent/40 hover:border-border text-muted-foreground"
                                    )}
                                >
                                    {mode === "shared" ? "Shared" : "Separate"}
                                    <div className="text-xs font-normal mt-1 text-muted-foreground/70">
                                        {mode === "shared" ? "All models see history" : "Each model has own thread"}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Synthesizer Model */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-primary" />
                            Synthesizer Model
                        </h3>
                        <div className="space-y-1.5">
                            {AVAILABLE_MODELS.filter((m) =>
                                ["pollinations-openai", "nvidia-llama-3-3", "nvidia-mistral-large"].includes(m.id)
                            ).map((model) => (
                                <div
                                    key={model.id}
                                    className={cn(
                                        "flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all border text-sm",
                                        synthesizerModel === model.id
                                            ? "bg-primary/10 border-primary/30 text-primary"
                                            : "border-border/60 hover:bg-accent/40"
                                    )}
                                    onClick={() => setSynthesizerModel(model.id)}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                                        synthesizerModel === model.id ? "bg-primary border-primary" : "border-muted-foreground/40"
                                    )}>
                                        {synthesizerModel === model.id && <div className="w-1.5 h-1.5 rounded-sm bg-primary-foreground" />}
                                    </div>
                                    {model.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Privacy Note */}
                    <div className="p-4 rounded-xl bg-accent/40 border border-border/50 text-xs text-muted-foreground/80 space-y-2">
                        <div className="font-semibold text-foreground/90 flex items-center gap-1.5">
                            <span className="text-sm">🔒</span> Privacy Note
                        </div>
                        <p>
                            Your API keys are stored server-side only and never exposed to the browser.
                            Questions and answers are stored in your local database. Content is sent to the
                            respective AI provider APIs.
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
