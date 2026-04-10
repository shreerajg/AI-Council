"use client";

import { useCouncilStore } from "@/store/councilStore";
import { ModelCard } from "./ModelCard";
import { cn } from "@/lib/utils";

export function CouncilGrid() {
    const { selectedModels } = useCouncilStore();

    if (selectedModels.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select models in Settings to get started
            </div>
        );
    }

    return (
        <div
            className="grid gap-4 w-full"
            style={{
                gridTemplateColumns: `repeat(${Math.min(selectedModels.length, 2)}, 1fr)`,
            }}
        >
            {selectedModels.map((modelId, index) => (
                <div
                    key={modelId}
                    className={cn(
                        "animate-scale-in card-hover-lift",
                        index === 0 && "stagger-1",
                        index === 1 && "stagger-2",
                        index === 2 && "stagger-3",
                        index === 3 && "stagger-4",
                        index === 4 && "stagger-5",
                        index === 5 && "stagger-6"
                    )}
                    style={{ animationDelay: `${index * 0.08}s` }}
                >
                    <ModelCard modelId={modelId} />
                </div>
            ))}
        </div>
    );
}
