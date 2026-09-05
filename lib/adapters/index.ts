import { createOpenAICompatAdapter } from "./openai-compat";
import { createPollinationsAdapter } from "./pollinations";
import type { ModelAdapter } from "./types";

export function getAdapter(modelId: string): ModelAdapter {
    if (modelId.startsWith("pollinations-")) {
        return createPollinationsAdapter(modelId);
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

