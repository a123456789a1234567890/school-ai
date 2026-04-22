app.post("/ai", async (req, res) => {
  try {
    const { prompt, school_data } = req.body;

    if (!prompt) {
      return res.status(400).json({ reply: "Please provide a prompt" });
    }

    if (!API_KEY) {
      return res.status(500).json({ reply: "Missing API key" });
    }

    // =========================
    // ADD SCHOOL CONTEXT (NEW)
    // =========================
    let finalPrompt = prompt;

    if (school_data) {
      finalPrompt = `
You are a School AI Assistant.

Use the following school data to answer the question:

SCHOOL DATA:
${JSON.stringify(school_data, null, 2)}

USER QUESTION:
${prompt}

Give clear analysis, mention students if relevant, and provide insights.
      `;
    }

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
