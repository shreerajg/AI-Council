import { getAdapter } from "./adapters";
import type { AdapterMessage, AdapterSettings } from "./adapters/types";

export interface FactCheckResult {
    claim: string;
    checkerModel: string;
    verdict: "true" | "false" | "uncertain";
    reasoning: string;
    confidence: number;
}

export interface FactCheckOptions {
    claims: string[];
    checkerModels: string[];
    signal: AbortSignal;
    onEvent: (event: FactCheckSSEEvent) => void;
}

export type FactCheckSSEEvent =
    | { event: "factcheck_start"; totalClaims: number }
    | { event: "claim_start"; claimIndex: number; claim: string }
    | { event: "checking"; claimIndex: number; checkerModel: string }
    | { event: "check_result"; claimIndex: number; checkerModel: string; result: FactCheckResult }
    | { event: "claim_complete"; claimIndex: number; results: FactCheckResult[] }
    | { event: "factcheck_complete"; allResults: FactCheckResult[][] }
    | { event: "factcheck_error"; error: string };

async function checkClaim(
    claim: string,
    checkerModels: string[],
    signal: AbortSignal,
    onEvent: (event: FactCheckSSEEvent) => void,
    claimIndex: number
): Promise<FactCheckResult[]> {
    const results: FactCheckResult[] = [];

    const checkPrompt = `You are a fact-checker. Evaluate the following claim and provide a verdict.

Claim: "${claim}"

Respond with:
1. VERDICT: (true/false/uncertain)
2. CONFIDENCE: (0.0-1.0)
3. REASONING: (brief explanation)

Format your response as:
VERDICT: [true/false/uncertain]
CONFIDENCE: [0.0-1.0]
REASONING: [your reasoning]`;

    for (const checkerModel of checkerModels) {
        if (signal.aborted) break;

        onEvent({
            event: "checking",
            claimIndex,
            checkerModel,
        });

        let responseText = "";

        try {
            const adapter = getAdapter(checkerModel);
            const messages: AdapterMessage[] = [
                { role: "user", content: checkPrompt },
            ];

            for await (const chunk of adapter.stream(
                messages,
                { temperature: 0.3, maxTokens: 500 },
                signal
            )) {
                if (chunk.type === "token") {
                    responseText += chunk.text;
                }
            }

            const verdict = responseText.includes("true")
                ? "true"
                : responseText.includes("false")
                ? "false"
                : "uncertain";

            const confidenceMatch = responseText.match(/CONFIDENCE:\s*([\d.]+)/);
            const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

            const result: FactCheckResult = {
                claim,
                checkerModel,
                verdict,
                reasoning: responseText.substring(0, 200),
                confidence: Math.min(1, Math.max(0, confidence)),
            };

            results.push(result);

            onEvent({
                event: "check_result",
                claimIndex,
                checkerModel,
                result,
            });
        } catch (err) {
            console.error(`Error checking claim with ${checkerModel}:`, err);
        }
    }

    onEvent({
        event: "claim_complete",
        claimIndex,
        results,
    });

    return results;
}

export async function factCheck(options: FactCheckOptions): Promise<void> {
    const { claims, checkerModels, signal, onEvent } = options;

    onEvent({ event: "factcheck_start", totalClaims: claims.length });

    const allResults: FactCheckResult[][] = [];

    try {
        for (let i = 0; i < claims.length; i++) {
            if (signal.aborted) break;

            onEvent({
                event: "claim_start",
                claimIndex: i,
                claim: claims[i],
            });

            const claimResults = await checkClaim(claims[i], checkerModels, signal, onEvent, i);
            allResults.push(claimResults);
        }

        onEvent({
            event: "factcheck_complete",
            allResults,
        });
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onEvent({ event: "factcheck_error", error: errorMsg });
    }
}
