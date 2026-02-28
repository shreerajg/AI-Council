import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding demo data...");

    // Create a demo thread
    const thread1 = await prisma.thread.create({
        data: {
            title: "What are the main differences between REST and GraphQL?",
            messages: {
                create: [
                    {
                        role: "user",
                        content: "What are the main differences between REST and GraphQL? Which should I choose for a new API project?",
                    },
                ],
            },
            modelRuns: {
                create: [
                    {
                        provider: "openai",
                        model: "pollinations-openai",
                        settingsSnap: JSON.stringify({ temperature: 0.7, maxTokens: 2048 }),
                        output: `## REST vs GraphQL: Key Differences

**REST (Representational State Transfer)** and **GraphQL** are both API paradigms, but they differ fundamentally in how data is fetched and structured.

### REST
- Uses multiple endpoints (e.g., \`/users\`, \`/posts\`, \`/comments\`)
- Returns fixed data structures defined by the server
- Can suffer from over-fetching (too much data) or under-fetching (too little)
- Simple, well-understood, broad tooling support

### GraphQL
- Uses a single endpoint (\`/graphql\`)
- Clients specify exactly what data they need
- Eliminates over/under-fetching
- Strongly typed schema
- Steeper learning curve

### When to choose:
- **Choose REST** for simple CRUD APIs, public APIs, or when your team is already familiar with REST
- **Choose GraphQL** for complex data graphs, mobile apps where bandwidth matters, or when multiple clients have different data needs`,
                        latencyMs: 1823,
                        usage: JSON.stringify({ promptTokens: 45, completionTokens: 210, totalTokens: 255 }),
                        finishReason: "stop",
                    },
                    {
                        provider: "gemini",
                        model: "gemini-1.5-pro",
                        settingsSnap: JSON.stringify({ temperature: 0.7, maxTokens: 2048 }),
                        output: `## REST vs GraphQL: A Comprehensive Comparison

REST and GraphQL represent two different philosophies for building APIs. Here's a breakdown:

### Architecture
| Feature | REST | GraphQL |
|---------|------|---------|
| Endpoints | Multiple | Single |
| Query flexibility | Fixed | Client-defined |
| Over-fetching | Common | Eliminated |
| Versioning | URL-based | Schema evolution |

### GraphQL advantages
1. **Precise data fetching** - ask for exactly what you need
2. **Strongly typed** - catch errors at build time
3. **Introspection** - self-documenting API
4. **Real-time** - built-in subscription support

### REST advantages
1. **Simplicity** - easier to learn and implement
2. **Caching** - HTTP caching works naturally
3. **Ecosystem** - vast tooling and library support
4. **Error handling** - standard HTTP status codes

For a new project, I'd recommend **REST** unless you have specific requirements that benefit from GraphQL.`,
                        latencyMs: 2145,
                        usage: JSON.stringify({ promptTokens: 48, completionTokens: 240, totalTokens: 288 }),
                        finishReason: "stop",
                    },
                ],
            },
        },
    });

    const thread2 = await prisma.thread.create({
        data: {
            title: "Compare causes of the 1857 Revolt across regions",
            messages: {
                create: [
                    {
                        role: "user",
                        content:
                            "Compare the causes of the 1857 revolt across regions; include economic and military factors.",
                    },
                ],
            },
        },
    });

    console.log("✅ Created demo threads:", thread1.id, thread2.id);
    console.log("🎉 Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
