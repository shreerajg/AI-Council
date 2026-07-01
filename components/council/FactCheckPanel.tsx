"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Check, X, HelpCircle, Loader2 } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/adapters/types";
import type { FactCheckResult } from "@/lib/factcheck";

interface FactCheckPanelProps {
    threadId: string;
    modelRunId?: string;
    onFactCheck: (claims: string[], checkers: string[]) => void;
    isChecking?: boolean;
    results?: FactCheckResult[][];
}

export function FactCheckPanel({ threadId, modelRunId, onFactCheck, isChecking, results }: FactCheckPanelProps) {
    const [claims, setClaims] = useState<string[]>([""]);
    const [selectedCheckers, setSelectedCheckers] = useState<string[]>([
        AVAILABLE_MODELS[0]?.id || "pollinations-openai"
    ]);
    const [isOpen, setIsOpen] = useState(false);

    const toggleChecker = (id: string) => {
        setSelectedCheckers(prev => 
            prev.includes(id) 
                ? prev.filter(c => c !== id)
                : [...prev, id]
        );
    };

    const handleCheck = () => {
        const validClaims = claims.filter(c => c.trim().length > 0);
        if (validClaims.length === 0 || selectedCheckers.length === 0) return;
        onFactCheck(validClaims, selectedCheckers);
    };

    if (!isOpen) {
        return (
            <Button onClick={() => setIsOpen(true)} variant="outline" size="sm" className="gap-2">
                <ShieldCheck size={16} /> Fact Check
            </Button>
        );
    }

    return (
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden mb-4">
            <div className="bg-gray-50 border-b p-3 flex justify-between items-center">
                <div className="flex items-center gap-2 font-medium text-sm">
                    <ShieldCheck size={16} className="text-blue-600" /> Fact Check Engine
                </div>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Claims to Verify</label>
                    <div className="space-y-2">
                        {claims.map((claim, idx) => (
                            <input
                                key={idx}
                                type="text"
                                value={claim}
                                onChange={(e) => {
                                    const newClaims = [...claims];
                                    newClaims[idx] = e.target.value;
                                    setClaims(newClaims);
                                }}
                                placeholder="Enter a statement or claim to verify..."
                                className="w-full text-sm border rounded p-2"
                            />
                        ))}
                    </div>
                    <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setClaims([...claims, ""])}
                        className="px-0 h-auto text-xs mt-1"
                    >
                        + Add another claim
                    </Button>
                </div>

                <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Verification Models</label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_MODELS.map(model => (
                            <button
                                key={model.id}
                                onClick={() => toggleChecker(model.id)}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                    selectedCheckers.includes(model.id)
                                        ? "bg-blue-100 border-blue-300 text-blue-700"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                {model.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleCheck} 
                        disabled={isChecking || claims.filter(c => c.trim()).length === 0 || selectedCheckers.length === 0}
                        className="w-full gap-2"
                        size="sm"
                    >
                        {isChecking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {isChecking ? "Verifying..." : "Run Fact Check"}
                    </Button>
                </div>

                {results && results.length > 0 && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                        <label className="block text-xs font-semibold uppercase text-gray-500">Results</label>
                        {results.map((claimResults, idx) => (
                            <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                                <div className="font-medium mb-2 border-b pb-1">"{claimResults[0]?.claim}"</div>
                                <div className="space-y-2">
                                    {claimResults.map((res, ridx) => (
                                        <div key={ridx} className="flex gap-2 items-start bg-white p-2 rounded border">
                                            <div className="mt-0.5">
                                                {res.verdict === "true" && <Check size={14} className="text-green-500" />}
                                                {res.verdict === "false" && <X size={14} className="text-red-500" />}
                                                {res.verdict === "uncertain" && <HelpCircle size={14} className="text-yellow-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-semibold text-xs">{res.checkerModel}</span>
                                                    <Badge variant={res.verdict === "true" ? "default" : res.verdict === "false" ? "destructive" : "secondary"} className="text-[10px]">
                                                        {res.verdict.toUpperCase()} ({(res.confidence * 100).toFixed(0)}%)
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-gray-600">{res.reasoning}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
