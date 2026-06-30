import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface NotionBlock {
    object: "block";
    type: string;
    [key: string]: unknown;
}

function heading1(text: string): NotionBlock {
    return {
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
    };
}

function heading2(text: string): NotionBlock {
    return {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
    };
}

function paragraph(text: string): NotionBlock {
    return {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
    };
}

function divider(): NotionBlock {
    return { object: "block", type: "divider", divider: {} };
}

function chunkText(text: string, chunkSize = 1900): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks.length > 0 ? chunks : [""];
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
        return NextResponse.json(
            { error: "NOTION_API_KEY is not configured on the server" },
            { status: 500 }
        );
    }

    try {
        const { databaseId, question, runs, synthesis } = await req.json();

        if (!databaseId || !question) {
            return NextResponse.json({ error: "Missing databaseId or question" }, { status: 400 });
        }

        const blocks: NotionBlock[] = [
            heading1("AI Council Export"),
            paragraph(`Exported on ${new Date().toLocaleString()}`),
            divider(),
            heading2("Question"),
            paragraph(question),
            divider(),
            heading2("Model Responses"),
        ];

        for (const run of (runs || [])) {
            blocks.push(heading2(`${run.modelId}`));
            const meta: string[] = [];
            if (run.latencyMs) meta.push(`Latency: ${(run.latencyMs / 1000).toFixed(1)}s`);
            if (run.usage?.totalTokens) meta.push(`Tokens: ${run.usage.totalTokens}`);
            if (meta.length > 0) blocks.push(paragraph(meta.join(" | ")));

            const textChunks = chunkText(run.output || "(No response)");
            for (const chunk of textChunks) {
                blocks.push(paragraph(chunk));
            }
            blocks.push(divider());
        }

        if (synthesis) {
            blocks.push(heading2("Synthesis"));
            const synthChunks = chunkText(synthesis);
            for (const chunk of synthChunks) {
                blocks.push(paragraph(chunk));
            }
        }

        // Create the page in the Notion database
        const notionRes = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${notionApiKey}`,
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28",
            },
            body: JSON.stringify({
                parent: { database_id: databaseId },
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: `AI Council: ${question.slice(0, 80)}${question.length > 80 ? "…" : ""}`,
                                },
                            },
                        ],
                    },
                },
                children: blocks.slice(0, 100),
            }),
        });

        if (!notionRes.ok) {
            const err = await notionRes.json();
            return NextResponse.json(
                { error: err.message || "Notion API error" },
                { status: notionRes.status }
            );
        }

        const page = await notionRes.json();
        return NextResponse.json({ pageUrl: page.url, pageId: page.id });
    } catch (error) {
        console.error("Notion export error:", error);
        return NextResponse.json({ error: "Failed to export to Notion" }, { status: 500 });
    }
}
