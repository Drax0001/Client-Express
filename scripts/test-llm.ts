
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testLLM() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY not found in .env");
        process.exit(1);
    }

    console.log(`Testing Gemini LLM with key: ${apiKey.substring(0, 8)}...`);

    try {
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: "gemini-1.5-flash",
            temperature: 0.3,
        });

        console.log("Generating response for 'Hello, who are you?'...");
        const response = await model.invoke("Hello, who are you?");

        if (!response || !response.content) {
            console.error("❌ Returned empty response");
            process.exit(1);
        }

        console.log(`✅ Success! Response received:`);
        console.log(response.content);

    } catch (error: any) {
        console.error("❌ LLM generation failed:", error);
        if (error.stack) console.error(error.stack);
    }
}

testLLM();
