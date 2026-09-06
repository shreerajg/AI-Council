"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface AttachedFile {
    file: File;
    type: "image" | "pdf";
    url?: string;
    textContext?: string;
}

interface FileUploadProps {
    onAttach: (file: AttachedFile) => void;
    onRemove: (index: number) => void;
    attachments: AttachedFile[];
}

export function FileUpload({ onAttach, onRemove, attachments }: FileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        for (const file of files) {
            if (file.type === "application/pdf") {
                onAttach({ file, type: "pdf" });
            } else if (file.type.startsWith("image/")) {
                const url = URL.createObjectURL(file);
                onAttach({ file, type: "image", url });
            }
        }
        
        // Reset input so the same file can be selected again if removed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
            />
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 rounded-xl hover-scale hover-lift text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Attach PDF or Image</TooltipContent>
            </Tooltip>

            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 absolute bottom-[100%] left-0 w-full p-2 bg-background/80 backdrop-blur-sm border-t border-border/50 rounded-t-2xl">
                    {attachments.map((att, idx) => (
                        <div key={idx} className="relative group rounded-md border border-border/50 bg-card overflow-hidden flex items-center justify-center p-1 w-16 h-16">
                            {att.type === "image" ? (
                                <img src={att.url} alt="attachment" className="w-full h-full object-cover rounded-sm" />
                            ) : (
                                <FileText className="w-8 h-8 text-primary/60" />
                            )}
                            <button
                                type="button"
                                onClick={() => onRemove(idx)}
                                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
