
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testEmbedding() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY not found in .env");
        process.exit(1);
    }

    console.log(`Testing Gemini Embeddings with key: ${apiKey.substring(0, 8)}...`);

    try {
        const model = new GoogleGenerativeAIEmbeddings({
            apiKey: apiKey,
            modelName: "text-embedding-004",
        });

        console.log("Generating embedding for 'Hello world'...");
        const embeddings = await model.embedDocuments(["Hello world"]);

        if (!embeddings || embeddings.length === 0) {
            console.error("❌ Returned empty embeddings array");
            process.exit(1);
        }

        if (embeddings[0].length === 0) {
            console.error("❌ Returned empty vector for document");
            process.exit(1);
        }

        console.log(`✅ Success! Embedding generated. Vector length: ${embeddings[0].length}`);
        console.log(`First 5 dimensions: ${embeddings[0].slice(0, 5)}`);

    } catch (error: any) {
        console.error("❌ Embedding generation failed:", error.message);
        if (error.response) {
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

testEmbedding();
