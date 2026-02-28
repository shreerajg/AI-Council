"use client";

import { useCouncilStore } from "@/store/councilStore";
import { ModelCard } from "./ModelCard";

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
            {selectedModels.map((modelId) => (
                <ModelCard key={modelId} modelId={modelId} />
            ))}
        </div>
    );
}
