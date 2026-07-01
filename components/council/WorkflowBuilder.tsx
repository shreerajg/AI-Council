"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Play } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/adapters/types";
import type { WorkflowStep } from "@/lib/workflow";

interface WorkflowBuilderProps {
    threadId: string;
    onExecute: (name: string, steps: WorkflowStep[], input: string) => void;
    isExecuting?: boolean;
}

type StepType = "researcher" | "writer" | "critic" | "synthesizer" | "code_exec";

const STEP_TYPES: { value: StepType; label: string; description: string }[] = [
    { value: "researcher", label: "Researcher", description: "Gathers information and analyzes" },
    { value: "writer", label: "Writer", description: "Drafts content or responses" },
    { value: "critic", label: "Critic", description: "Reviews and critiques work" },
    { value: "synthesizer", label: "Synthesizer", description: "Combines multiple perspectives" },
    { value: "code_exec", label: "Code Executor", description: "Generates and explains code" },
];

export function WorkflowBuilder({ threadId, onExecute, isExecuting }: WorkflowBuilderProps) {
    const [workflowName, setWorkflowName] = useState("My Workflow");
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [input, setInput] = useState("");
    const [showBuilder, setShowBuilder] = useState(false);

    const addStep = () => {
        const newStep: WorkflowStep = {
            stepIndex: steps.length,
            type: "researcher",
            modelId: AVAILABLE_MODELS[0]?.id || "pollinations-openai",
            promptTemplate: "{{input}}",
        };
        setSteps([...steps, newStep]);
    };

    const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
        const updated = [...steps];
        updated[index] = { ...updated[index], ...updates };
        setSteps(updated);
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleExecute = () => {
        if (steps.length === 0 || !input.trim()) {
            alert("Please add at least one step and provide input");
            return;
        }
        onExecute(workflowName, steps, input);
    };

    if (!showBuilder) {
        return (
            <Button onClick={() => setShowBuilder(true)} variant="outline" size="sm">
                Workflow
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold">Agentic Workflow Builder</h2>
                    <button onClick={() => setShowBuilder(false)} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Workflow Name</label>
                        <input
                            type="text"
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Initial Input</label>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Enter the input for your workflow..."
                            rows={3}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Workflow Steps</h3>
                            <Button onClick={addStep} size="sm" variant="outline">
                                <Plus size={16} className="mr-1" /> Add Step
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {steps.map((step, idx) => (
                                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="secondary">Step {step.stepIndex + 1}</Badge>
                                        <button
                                            onClick={() => removeStep(idx)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Step Type</label>
                                            <select
                                                value={step.type}
                                                onChange={(e) => updateStep(idx, { type: e.target.value as StepType })}
                                                className="w-full px-3 py-2 border rounded-md text-sm"
                                            >
                                                {STEP_TYPES.map((t) => (
                                                    <option key={t.value} value={t.value}>
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Model</label>
                                            <select
                                                value={step.modelId}
                                                onChange={(e) => updateStep(idx, { modelId: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-md text-sm"
                                            >
                                                {AVAILABLE_MODELS.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Prompt Template</label>
                                        <textarea
                                            value={step.promptTemplate}
                                            onChange={(e) => updateStep(idx, { promptTemplate: e.target.value })}
                                            placeholder='Use {{input}} as placeholder for previous step output'
                                            rows={2}
                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            ))}

                            {steps.length === 0 && (
                                <p className="text-center text-gray-500 py-8">No steps yet. Add one to get started.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end border-t pt-6">
                        <Button onClick={() => setShowBuilder(false)} variant="outline">
                            Cancel
                        </Button>
                        <Button onClick={handleExecute} disabled={isExecuting} className="gap-2">
                            <Play size={16} /> Execute Workflow
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
