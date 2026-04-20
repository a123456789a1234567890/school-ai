const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// Fix fetch for Node
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("School AI Backend Running");
});

// ======================
// RETRY GEMINI FUNCTION
// ======================
async function callGemini(body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (data?.candidates?.length) {
        return data;
      }

      if (data?.error?.message?.includes("high demand")) {
        console.log("Gemini overloaded, retrying...");
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return data;
    } catch (err) {
      console.error("Gemini error:", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { error: { message: "AI unavailable" } };
}

// ======================
// AI ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    let { prompt, school_data } = req.body;

    if (!prompt) {
      return res.json({ reply: "No prompt provided" });
    }

    // ======================
    // SAFE DATA NORMALIZATION (IMPORTANT FIX)
    // ======================
    if (!school_data || typeof school_data !== "object") {
      school_data = {};
    }

    if (!Array.isArray(school_data.students)) {
      school_data.students = [];
    }

    if (!Array.isArray(school_data.marks)) {
      school_data.marks = [];
    }

    if (!Array.isArray(school_data.subjects)) {
      school_data.subjects = [];
    }

    if (!Array.isArray(school_data.classes)) {
      school_data.classes = [];
    }

    // ======================
    // STRONG ANALYTICAL PROMPT
    // ======================
    const context = `
You are a SCHOOL PERFORMANCE ANALYST.

RULES:
- Always analyze data safely
- Group marks by student_id
- Compute averages when needed
- Rank students if possible
- Identify best and weakest students
- If no data exists, say "No data available"

DATA:
${JSON.stringify(school_data, null, 2)}

QUESTION:
${prompt}
`;

    const result = await callGemini({
      contents: [
        {
          parts: [{ text: context }],
        },
      ],
    });

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.json({ reply: "Server error" });
  }
});

// ======================
// REPORT ROUTE
// ======================
app.post("/ai-report", async (req, res) => {
  try {
    const { student_id, term_id, school_data } = req.body;

    const prompt = `
Generate a student report card.

DATA:
${JSON.stringify(school_data)}

Student ID: ${student_id}
Term ID: ${term_id}

Include:
- performance summary
- strengths
- weaknesses
- recommendations
`;

    const result = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
    });

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
