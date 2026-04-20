const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

// ======================
// ENV VARIABLES
// ======================
const API_KEY = process.env.GEMINI_API_KEY;

// ======================
// FIX fetch for Node (safe for older Node versions)
// ======================
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// PORT (RENDER COMPATIBLE)
// ======================
const PORT = process.env.PORT || 3000;

// ======================
// HEALTH CHECK ROUTE
// ======================
app.get("/", (req, res) => {
  res.send("School AI Backend Running 🚀");
});

// ======================
// AI CHAT ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data } = req.body;

    if (!prompt) {
      return res.status(400).json({ reply: "No prompt provided" });
    }

    if (!API_KEY) {
      return res.status(500).json({ reply: "Missing GEMINI_API_KEY" });
    }

    const context = `
You are an AI assistant inside a School Management System.

Use the provided school data to answer accurately and intelligently.

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}

USER QUESTION:
${prompt}

INSTRUCTIONS:
- Use only provided data when possible
- Give teacher-level insights
- Mention student names if present
- Be precise, structured, and helpful
`;

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
              parts: [{ text: context }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.error?.message ||
      "No response from AI";

    res.json({ reply: text });
  } catch (err) {
    console.error("AI ROUTE ERROR:", err);
    res.status(500).json({ reply: "Server error" });
  }
});

// ======================
// REPORT GENERATION ROUTE
// ======================
app.post("/ai-report", async (req, res) => {
  try {
    const { student_id, term_id, school_data } = req.body;

    if (!API_KEY) {
      return res.status(500).json({ report: "Missing GEMINI_API_KEY" });
    }

    const prompt = `
Generate a professional student report card.

Student Data:
${JSON.stringify(school_data, null, 2)}

Student ID: ${student_id}
Term ID: ${term_id}

Include:
- Performance summary
- Strengths
- Weaknesses
- Recommendations
- Teacher remarks
`;

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
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const result = await response.json();

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.error?.message ||
      "No response";

    res.json({ report: text });
  } catch (err) {
    console.error("REPORT ROUTE ERROR:", err);
    res.status(500).json({ report: "Server error generating report" });
  }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
