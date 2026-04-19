const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// FIX fetch for Node
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("School AI Backend Running");
});

// ======================
// AI CHAT ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data } = req.body;

    if (!prompt) {
      return res.json({ reply: "No prompt provided" });
    }

    // 🧠 BUILD CONTEXT FOR AI
    const context = `
You are an AI assistant inside a School Management System.

Use the provided school data to answer accurately.

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}

USER QUESTION:
${prompt}

INSTRUCTIONS:
- If data is available, analyze it
- Give teacher-level insights
- Mention student names if present
- Be precise and helpful
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: context }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.error?.message ||
      "No response from AI";

    res.json({ reply: text });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Server error" });
  }
});

// ======================
// REPORT ROUTE (OPTIONAL)
// ======================
app.post("/ai-report", async (req, res) => {
  try {
    const { student_id, term_id, school_data } = req.body;

    const prompt = `
Generate a professional student report card.

Student Data:
${JSON.stringify(school_data)}

Student ID: ${student_id}
Term ID: ${term_id}

Include:
- performance summary
- strengths
- weaknesses
- recommendation
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const result = await response.json();

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response";

    res.json({ report: text });

  } catch (err) {
    console.error(err);
    res.json({ report: "Error generating report" });
  }
});

// ======================
// START SERVER
// ======================
app.listen(3000, () => {
  console.log("🚀 Server running on http://127.0.0.1:3000");
});