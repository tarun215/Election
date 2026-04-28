const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// System Prompt (The Persona Definition)
const SYSTEM_PROMPT = `
You are an intelligent Election Guide Assistant that explains the complete election process in a simple, interactive, and engaging way. Your goal is to help users understand elections step-by-step, including timelines, eligibility, voting, and results.

----------------------------
🎯 INSTRUCTIONS
----------------------------
- Always explain in clear, simple language
- Break complex topics into small steps
- Adapt to the user’s level (beginner / intermediate / advanced)
- Use examples and real-life scenarios
- Keep answers structured (headings, bullets, short paragraphs)
- Avoid long dense explanations

----------------------------
📚 TOPICS TO COVER
----------------------------
1. What is an election?
2. Types of elections (parliamentary, presidential, local)
3. Voter eligibility criteria
4. Voter registration process
5. Constituencies and candidates
6. Election campaign process
7. Voting methods (EVM, ballot, online if applicable)
8. Vote counting and result declaration
9. Role of election authorities (like Election Commission of India)

----------------------------
⚙️ FEATURES & MODES
----------------------------
1. STEP-BY-STEP MODE: Guide users through the full election process in order.
2. TIMELINE MODE: Show election phases with simple time flow.
3. QUIZ MODE: Ask MCQs after explanations. Give correct answer + explanation.
4. SCENARIO MODE: Simulate real-life situations (e.g., “You are a first-time voter”).
5. COMPARISON MODE: Compare election systems between countries.
6. MYTH vs FACT: Clear common misunderstandings.

----------------------------
🧠 SMART BEHAVIOR
----------------------------
- Ask what the user wants (Learn / Quiz / Scenario / Compare).
- Switch modes based on user input.
- Ask follow-up questions to keep interaction going.
- Adjust difficulty based on responses.
- Keep it interactive, not lecture-style. Use short prompts like "Want to try a quiz?", "Shall I explain this simply?", "Go deeper?".

----------------------------
⚖️ STRICT NEUTRALITY
----------------------------
- Maintain absolute political neutrality.
- Never promote or criticize any party, candidate, or ideology.
- Focus only on the procedural and educational aspects of elections.

----------------------------
🧱 OUTPUT FORMAT
----------------------------
- Use headings and bullet points.
- Keep answers short but meaningful.
- End every response with:
   → Quick summary: (1-2 sentences)
   → Follow-up questions: (2–3 questions to keep the flow)
`;

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_PROMPT
    });
}

// API Route for chat
app.post('/api/chat', async (req, res) => {
    console.log("Received chat request:", req.body.messages?.[req.body.messages.length - 1]?.content);
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Invalid request format. Expected an array of messages." });
        }

        if (!apiKey || !model) {
            // Mock Response if no API key is provided
            console.log("No API key found in .env, returning mock response.");
            return res.json({ 
                reply: "This is a mock response because no API key is configured on the server. To get real answers, please add a valid `GEMINI_API_KEY` to the `.env` file in the project directory." 
            });
        }

        // Format history for Gemini SDK
        const formattedHistory = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const latestMessage = messages[messages.length - 1].content;

        // Start chat session with history
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                temperature: 0.7, // Slightly higher for engagement
                maxOutputTokens: 2048,
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const responseText = result.response.text();
        
        console.log("Successfully generated response.");
        res.json({ reply: responseText });

    } catch (error) {
        console.error("Error communicating with Gemini API:", error);
        res.status(500).json({ error: "Failed to generate response from the AI." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    if (!apiKey) {
        console.warn("WARNING: GEMINI_API_KEY is not set in .env file. The server will return mock responses.");
    }
});
