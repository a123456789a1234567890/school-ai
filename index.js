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

// ======================
// HEALTH CHECK  
// ======================
app.get("/", (req, res) => {
  res.send("AI API is running 🚀");
});

// ======================
// AI ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ reply: "Please provide a prompt" });
    }
    if (!API_KEY) {
      return res.status(500).json({ reply: "Missing OpenRouter API key" });
    }

    // ------------------------------------------------------------------
    // 1. Build the conversation messages array (OpenRouter format)
    // ------------------------------------------------------------------
    const messages = [];

    // System message (defines AI behavior)
    let systemContent = "You are a helpful AI assistant.";

    // If school data exists and the prompt looks like a school-related question
    const isSchoolQuestion =
      /student|mark|grade|class|report|school|exam|result|pupil|teacher/i.test(prompt);
    
    if (school_data && isSchoolQuestion) {
      systemContent = `You are a School AI Assistant. Use the following school data to answer questions accurately.
If a student is not found in the data, reply exactly: "Student not found in records".

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}`;
    }

    messages.push({ role: "system", content: systemContent });

    // Append conversation history (if provided and valid)
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        // Ensure only 'user' and 'assistant' roles are added
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Append the current user prompt
    messages.push({ role: "user", content: prompt });

    // ------------------------------------------------------------------
    // 2. Call OpenRouter API
    // ------------------------------------------------------------------
    // Feel free to change the model to any OpenRouter supported one
    const model = "meta-llama/llama-3-8b-instruct"; // or "openai/gpt-3.5-turbo", "google/gemini-flash-1.5", etc.

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    // Debug log (visible in Render / your server logs)
    console.log("OpenRouter response status:", response.status);
    if (!response.ok) {
      console.error("OpenRouter error details:", JSON.stringify(data, null, 2));
    }

    // ------------------------------------------------------------------
    // 3. Extract reply
    // ------------------------------------------------------------------
    let reply = "No response from AI.";
    if (data?.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data?.error?.message) {
      reply = `API Error: ${data.error.message}`;
    }

    res.json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ reply: "Internal server error. Please try again later." });
  }
});

// ======================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
