export function generateMarkdownExport(
    question: string,
    runs: {
        modelId: string;
        output: string;
        latencyMs?: number;
        usage?: { totalTokens: number };
    }[],
    synthesis?: string | null
): string {
    const now = new Date().toISOString();
    let md = `# AI Council Export\n\n**Date:** ${now}\n\n---\n\n## Question\n\n${question}\n\n---\n\n## Model Responses\n\n`;

    for (const run of runs) {
        md += `### ${run.modelId}\n\n`;
        if (run.latencyMs) md += `*Latency: ${(run.latencyMs / 1000).toFixed(1)}s`;
        if (run.usage) md += ` | Tokens: ${run.usage.totalTokens}`;
        if (run.latencyMs || run.usage) md += "*\n\n";
        md += (run.output || "*No response*") + "\n\n---\n\n";
    }

    if (synthesis) {
        md += `## Synthesis\n\n${synthesis}\n`;
    }

    return md;
}

export function downloadMarkdown(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export async function downloadPDF(threadId: string, elementId: string): Promise<void> {
    // Dynamic import to avoid SSR issues
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");

    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
        backgroundColor: "#0a0f1e",
        scale: 1.5,
        useCORS: true,
    });

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`ai-council-${threadId}.pdf`);
}
