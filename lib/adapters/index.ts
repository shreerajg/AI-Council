import { createOpenAICompatAdapter } from "./openai-compat";
import { createPollinationsAdapter } from "./pollinations";
import type { ModelAdapter } from "./types";

export function getAdapter(modelId: string): ModelAdapter {
    if (modelId.startsWith("pollinations-")) {
        return createPollinationsAdapter(modelId);
    }

    // NVIDIA NIM Models
    if (modelId.startsWith("nvidia-")) {
        let actualModel = "";
        let apiKey = ""; // Default NVIDIA

        if (modelId === "nvidia-llama-3-3" || modelId === "nvidia-llama") {
            actualModel = "meta/llama-3.3-70b-instruct";
            apiKey = "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";
        } else if (modelId === "nvidia-mistral-large") {
            actualModel = "mistralai/mistral-large-3-675b-instruct-2512";
            apiKey = "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";
        }

        return createOpenAICompatAdapter(
            modelId,
            "https://integrate.api.nvidia.com/v1",
            apiKey,
            actualModel
        );
    }

    if (modelId.startsWith("compat:")) {
        const actualModel = modelId.replace("compat:", "");
        return createOpenAICompatAdapter(
            actualModel,
            process.env.OPENAI_COMPAT_BASE_URL || "",
            process.env.OPENAI_COMPAT_API_KEY || "",
            process.env.OPENAI_COMPAT_MODEL_NAME || actualModel
        );
    }

    throw new Error(`Unknown model: ${modelId}`);
}

export * from "./types";

