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

// Warn on startup if API key is missing
if (!API_KEY) {
  console.error("❌ OPENROUTER_API_KEY is not set in environment variables!");
}

app.get("/", (req, res) => {
  res.send("AI API is running 🚀");
});

app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ reply: "Please provide a prompt" });
    }
    if (!API_KEY) {
      return res.status(500).json({ reply: "Server misconfiguration: Missing OpenRouter API key" });
    }

    // Build messages array (same as before)
    const messages = [];

    // System message with optional school data
    let systemContent = "You are a helpful AI assistant.";
    const isSchoolQuestion = /student|mark|grade|class|report|school|exam|result|pupil|teacher/i.test(prompt);
    
    if (school_data && isSchoolQuestion) {
      systemContent = `You are a School AI Assistant. Use the following school data to answer.
If a student is not found, reply exactly: "Student not found in records".

DATA:
${JSON.stringify(school_data, null, 2)}`;
    }
    messages.push({ role: "system", content: systemContent });

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: "user", content: prompt });

    // Use a free OpenRouter model (no credits needed)
    const model = "nousresearch/hermes-2-pro-mistral-7b"; // free, fast, good for school data

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-school-app.com",  // Change to your actual domain
        "X-Title": "School AI Assistant"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    // Detailed logging for debugging (visible in Render logs)
    console.log(`[OpenRouter] Status: ${response.status}`);
    if (!response.ok) {
      console.error(`[OpenRouter] Error:`, JSON.stringify(data, null, 2));
    }

    // Extract reply or meaningful error
    let reply = "";
    if (data?.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data?.error?.message) {
      // Forward the exact OpenRouter error (e.g., "User not found", "Insufficient credits")
      reply = `API Error: ${data.error.message}`;
    } else {
      reply = "No response from AI.";
    }

    res.json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ reply: "Internal server error. Check logs." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!API_KEY) console.warn("⚠️  OPENROUTER_API_KEY is missing. Set it in Render environment.");
});
