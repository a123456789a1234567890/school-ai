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
// RETRY FUNCTION (IMPORTANT)
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
      console.error("API error:", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { error: { message: "AI unavailable" } };
}

// ======================
// AI CHAT ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data } = req.body;

    if (!prompt) {
      return res.json({ reply: "No prompt provided" });
    }

    // ======================
    // STRONG ANALYTICAL PROMPT
    // ======================
    const context = `
You are an AI SCHOOL PERFORMANCE ANALYST.

YOU MUST:
- Analyze students, marks, and subjects
- Calculate averages when needed
- Rank students from best to worst
- Identify weak and strong subjects
- NEVER say "no data" if data exists

DATA STRUCTURE:
- students (id, full_name)
- marks (student_id, subject_id, marks_obtained)
- subjects (id, subject_name)
- classes

IMPORTANT RULES:
1. Always group marks by student_id
2. Compute averages per student
3. Compare performance across students
4. Identify top performer and weakest student

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}

USER QUESTION:
${prompt}
`;

    const result = await callGemini({
      contents: [
        {
          parts: [{ text: context }],
        },
      ],
    });

    if (result?.error?.message) {
      return res.json({
        reply: "⚠️ AI is busy. Please try again.",
      });
    }

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
