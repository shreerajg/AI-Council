import * as pdfjsLib from 'pdfjs-dist';

// Setting the worker source to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map((item: any) => item.str)
                .join(" ");
            text += `\n--- Page ${i} ---\n${pageText}\n`;
        }

        return text.trim();
    } catch (error) {
        console.error("Error extracting PDF text:", error);
        throw new Error("Failed to extract text from PDF.");
    }
}
