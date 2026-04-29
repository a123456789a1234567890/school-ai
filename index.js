//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

/*
const express = require("express");
require("dotenv").config();

const app = express(); // ✅ MUST BE FIRST (fixes your error)
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

// Safe fetch for Render
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("AI API is running 🚀");
});

// ======================
// AI ROUTE (UPDATED WITH SCHOOL DATA SUPPORT)
// ======================
app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ reply: "Please provide a prompt" });
    }

    if (!API_KEY) {
      return res.status(500).json({ reply: "Missing API key" });
    }

    // ======================
    // BUILD PROMPT (SAFE EXTENSION)
    // ======================
let conversationContext = "";

if (history && Array.isArray(history)) {
  conversationContext = history
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");
}
    
    let finalPrompt = prompt;

if (school_data) {
  finalPrompt = `
You are a School AI Assistant.

Conversation so far:
${conversationContext}

Use the following school data to answer the question:

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}

Latest USER QUESTION:
${prompt}

IMPORTANT:
- Use conversation context to resolve references like "him", "above", "that student"
- Give clear, structured, and helpful analysis.
  `;
}

    // ======================
    // CALL GEMINI API
    // ======================
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: finalPrompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.error?.message ||
      "No response from AI";

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Server error" });
  }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

*/

const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

// Safe fetch for Render
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("AI API is running 🚀");
});

// ======================
// AI ROUTE (OPENROUTER VERSION)
// ======================
app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ reply: "Please provide a prompt" });
    }

    if (!API_KEY) {
      return res.status(500).json({ reply: "Missing API key" });
    }

    // ======================
    // BUILD MESSAGES ARRAY (BETTER THAN STRING CONTEXT)
    // ======================
    let messages = [];

    // Add system instruction if school data exists
    if (school_data) {
      messages.push({
        role: "system",
        content: `You are a School AI Assistant.

Use the provided school data to answer accurately.
Resolve references like "him", "above", or "that student" using context.
Give structured, clear, and helpful answers.

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}`
      });
    }

    // Add conversation history (if any)
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role, // "user" or "assistant"
            content: msg.content
          });
        }
      });
    }

    // Add latest user prompt
    messages.push({
      role: "user",
      content: prompt
    });

    // ======================
    // CALL OPENROUTER API
    // ======================
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", // optional but recommended
        "X-Title": "School AI Assistant"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // you can change this
        messages: messages,
      }),
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      "No response from AI";

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Server error" });
  }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
