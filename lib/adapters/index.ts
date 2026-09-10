import { createOpenAICompatAdapter } from "./openai-compat";
import { createPollinationsAdapter } from "./pollinations";
import type { ModelAdapter } from "./types";

export function getAdapter(modelId: string): ModelAdapter {
    if (modelId.startsWith("pollinations-")) {
        return createPollinationsAdapter(modelId);
    }
    
    if (modelId.startsWith("stepfun-")) {
        const actualModel = modelId.replace("stepfun-", "");
        return createOpenAICompatAdapter(
            actualModel,
            "https://api.stepfun.com/v1",
            settings?.apiKey || process.env.STEPFUN_API_KEY || "",
            actualModel
        );
    }

    if (modelId.startsWith("zhipu-")) {
        const actualModel = modelId.replace("zhipu-", "");
        return createOpenAICompatAdapter(
            actualModel,
            "https://open.bigmodel.cn/api/paas/v4",
            settings?.apiKey || process.env.ZHIPU_API_KEY || "",
            actualModel
        );
    }
    
    if (modelId.startsWith("gemini-")) {
        const actualModel = modelId.replace("gemini-", "");
        return createOpenAICompatAdapter(
            actualModel,
            "https://generativelanguage.googleapis.com/v1beta/openai/",
            settings?.apiKey || process.env.GEMINI_API_KEY || "",
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

