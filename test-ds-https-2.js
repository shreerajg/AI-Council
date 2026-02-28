const https = require('https');

async function main() {
    const data = JSON.stringify({
        model: "deepseek-ai/deepseek-r1-distill-qwen-32b",
        messages: [{ role: "user", content: "Hi" }],
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
        let fullStr = "";
        res.on('data', (chunk) => {
            const str = chunk.toString();
            fullStr += str;
            console.log(`CHUNK: ${str}`);
        });

        res.on('end', () => {
            console.log('END OF RESPONSE');
            console.log("FULL BODY WAS:", fullStr);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(data);
    req.end();
}

main();
