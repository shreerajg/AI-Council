const https = require('https');

async function main() {
    const data = JSON.stringify({
        model: "deepseek-ai/deepseek-r1-distill-qwen-32b",
        messages: [{ role: "user", content: "Hi" }],
        temperature: 0.6,
        top_p: 0.7,
        max_tokens: 4096,
        stream: true
    });

    const options = {
        hostname: 'integrate.api.nvidia.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });

        res.on('end', () => {
            console.log('No more data in response.');
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(data);
    req.end();
}

main();
