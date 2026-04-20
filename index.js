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
// 🔥 RETRY FUNCTION (CRITICAL FIX)
// ======================
async function callGemini(body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();

      // ✅ SUCCESS
      if (data?.candidates?.length) {
        return data;
      }

      // 🔴 HANDLE OVERLOAD
      if (data?.error?.message?.includes("high demand")) {
        console.log("⏳ Gemini overloaded, retrying...");
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      return data;

    } catch (err) {
      console.error("Fetch error:", err);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return { error: { message: "AI unavailable, try again later" } };
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

    // ✅ VALIDATE DATA
    const hasData =
      school_data &&
      school_data.students &&
      school_data.students.length > 0;

    // 🧠 CONTEXT
    const context = `
You are a school AI assistant.

STRICT RULES:
- ONLY use provided data
- If no data, say: "No school data available"
- Always mention student names, class, and marks
- Give insights like best students, weak areas

DATA:
${JSON.stringify(school_data, null, 2)}

QUESTION:
${prompt}
`;

    // ======================
    // CALL GEMINI (WITH RETRY)
    // ======================
    const data = await callGemini({
      contents: [
        {
          parts: [{ text: context }]
        }
      ]
    });

    // ======================
    // HANDLE RESPONSES
    // ======================
    if (data?.error?.message) {
      return res.json({
        reply: "⚠️ AI is busy right now. Please try again."
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    res.json({ reply: text });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Server error" });
  }
});

// ======================
// REPORT ROUTE (IMPROVED)
// ======================
app.post("/ai-report", async (req, res) => {
  try {
    const { student_id, term_id, school_data } = req.body;

    const prompt = `
Generate a student report.

DATA:
${JSON.stringify(school_data)}

Student ID: ${student_id}
Term: ${term_id}

Include:
- performance summary
- strengths
- weaknesses
- recommendations
`;

    const result = await callGemini({
      contents: [{ parts: [{ text: prompt }] }]
    });

    if (result?.error?.message) {
      return res.json({
        report: "⚠️ AI busy. Try again."
      });
    }

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
  console.log("🚀 Server running");
});
