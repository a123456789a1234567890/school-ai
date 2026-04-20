const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

// ======================
// STARTUP VALIDATION
// ======================
if (!API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in environment variables");
  process.exit(1);
}

// Fix fetch for Node
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ======================
// VALIDATION HELPERS
// ======================
function validateSchoolData(schoolData) {
  if (!schoolData || typeof schoolData !== "object") {
    return { valid: false, error: "school_data must be an object" };
  }

  if (!Array.isArray(schoolData.students)) {
    return { valid: false, error: "school_data.students must be an array" };
  }

  if (!Array.isArray(schoolData.marks)) {
    return { valid: false, error: "school_data.marks must be an array" };
  }

  if (schoolData.students.length === 0) {
    return { valid: false, error: "school_data.students cannot be empty" };
  }

  if (schoolData.marks.length === 0) {
    return { valid: false, error: "school_data.marks cannot be empty" };
  }

  return { valid: true };
}

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
        console.log(`Gemini overloaded, retrying... (attempt ${i + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return data;
    } catch (err) {
      console.error(`API error (attempt ${i + 1}/${retries}):`, err.message);
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

    // ✅ VALIDATION: Check if prompt exists
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ reply: "❌ No prompt provided" });
    }

    // ✅ VALIDATION: Check if school_data is valid
    const validation = validateSchoolData(school_data);
    if (!validation.valid) {
      return res.status(400).json({ reply: `❌ ${validation.error}` });
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
      return res.status(503).json({
        reply: "⚠️ AI is busy. Please try again.",
      });
    }

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    res.json({ reply: text });
  } catch (err) {
    console.error("Error in /ai route:", err);
    res.status(500).json({ reply: "❌ Server error" });
  }
});

// ======================
// REPORT ROUTE
// ======================
app.post("/ai-report", async (req, res) => {
  try {
    const { student_id, term_id, school_data } = req.body;

    // ✅ VALIDATION: Check if student_id exists and is valid
    if (!student_id || (typeof student_id !== "number" && typeof student_id !== "string")) {
      return res.status(400).json({ report: "❌ Invalid student_id" });
    }

    // ✅ VALIDATION: Check if term_id exists
    if (!term_id || (typeof term_id !== "number" && typeof term_id !== "string")) {
      return res.status(400).json({ report: "❌ Invalid term_id" });
    }

    // ✅ VALIDATION: Check if school_data is valid
    const validation = validateSchoolData(school_data);
    if (!validation.valid) {
      return res.status(400).json({ report: `❌ ${validation.error}` });
    }

    // ✅ VALIDATION: Check if student exists in data
    const studentExists = school_data.students.some((s) => s.id == student_id);
    if (!studentExists) {
      return res.status(404).json({ report: `❌ Student with ID ${student_id} not found` });
    }

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

    if (result?.error?.message) {
      return res.status(503).json({
        report: "⚠️ AI is busy. Please try again.",
      });
    }

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    res.json({ report: text });
  } catch (err) {
    console.error("Error in /ai-report route:", err);
    res.status(500).json({ report: "❌ Server error" });
  }
});

// ======================
// ERROR HANDLING MIDDLEWARE
// ======================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
