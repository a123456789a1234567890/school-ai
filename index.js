const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// fetch for Node
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("School AI Backend Running");
});

// ======================
// GEMINI CALL WITH RETRY
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

      if (data?.candidates?.length) return data;

      if (data?.error?.message?.includes("high demand")) {
        console.log("Gemini busy, retrying...");
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
// NORMALIZE SCHOOL DATA (KEY FIX)
// ======================
function normalizeSchoolData(data) {
  if (!data || typeof data !== "object") {
    return { students: [], marks: [], subjects: [], classes: [] };
  }

  // If PHP sends { success: true, students: [...] }
  if (data.success) {
    data = {
      students: data.students || [],
      marks: data.marks || [],
      subjects: data.subjects || [],
      classes: data.classes || [],
    };
  }

  return {
    students: Array.isArray(data.students) ? data.students : [],
    marks: Array.isArray(data.marks) ? data.marks : [],
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    classes: Array.isArray(data.classes) ? data.classes : [],
  };
}

// ======================
// AI CHAT ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    let { prompt, school_data } = req.body;

    if (!prompt) {
      return res.json({ reply: "No prompt provided" });
    }

    // 🔥 FIX: ALWAYS SAFE DATA
    school_data = normalizeSchoolData(school_data);

    const context = `
You are a SCHOOL PERFORMANCE ANALYST.

RULES:
- Always analyze student performance
- Group marks by student_id
- Compute averages when possible
- Rank students if enough data exists
- If no data, say clearly "No data available"

DATA:
${JSON.stringify(school_data, null, 2)}

QUESTION:
${prompt}
`;

    const result = await callGemini({
      contents: [{ parts: [{ text: context }] }],
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

    const safeData = normalizeSchoolData(school_data);

    const prompt = `
Generate a student report card.

DATA:
${JSON.stringify(safeData)}

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
