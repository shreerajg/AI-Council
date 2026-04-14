import { createOpenAICompatAdapter } from "./openai-compat";
import { createPollinationsAdapter } from "./pollinations";
import type { ModelAdapter } from "./types";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";

const MODEL_CONFIG: Record<string, { actualModel: string; apiKey: string }> = {
    "nvidia-llama-3-3": {
        actualModel: "meta/llama-3.3-70b-instruct",
        apiKey: NVIDIA_API_KEY,
    },
    "nvidia-llama": {
        actualModel: "meta/llama-3.3-70b-instruct",
        apiKey: NVIDIA_API_KEY,
    },
    "nvidia-mistral-large": {
        actualModel: "mistralai/mistral-large-3-675b-instruct-2512",
        apiKey: NVIDIA_API_KEY,
    },
};

export function getAdapter(modelId: string): ModelAdapter {
    if (modelId.startsWith("pollinations-")) {
        return createPollinationsAdapter(modelId);
    }

    if (modelId.startsWith("nvidia-")) {
        const config = MODEL_CONFIG[modelId];
        if (!config) {
            throw new Error(`Unknown NVIDIA model: ${modelId}`);
        }
        if (!config.apiKey) {
            throw new Error(`NVIDIA API key not configured. Set NVIDIA_API_KEY in .env`);
        }

        return createOpenAICompatAdapter(
            modelId,
            "https://integrate.api.nvidia.com/v1",
            config.apiKey,
            config.actualModel
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

