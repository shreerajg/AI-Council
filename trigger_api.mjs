const testApi = async () => {
    try {
        // 1. Create a thread
        const res = await fetch("http://localhost:3000/api/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Test thread", message: "Hi" })
        });
        const thread = await res.json();
        console.log("Created thread:", thread.id);

        // 2. Stream AI
        const models = encodeURIComponent(JSON.stringify(["pollinations-openai", "pollinations-claude"]));
        const url = `http://localhost:3000/api/council/stream?threadId=${thread.id}&models=${models}&message=Hi&settings={}`;

        console.log("Fetching stream...", url);
        const streamRes = await fetch(url);

        console.log("Response status:", streamRes.status);
        console.log("Headers:", streamRes.headers);
        const text = await streamRes.text();
        console.log("Body length:", text.length);
        console.log("Body:", text.substring(0, 500));

    } catch (e) {
        console.error("Failed:", e);
    }
}

testApi();
