// File location: fitai/api/claude.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-5",
        max_tokens: max_tokens || 4000,
        messages,
        ...(system && { system }),
      }),
    });

    const data = await response.json();

    // Strip markdown fences from text responses so JSON.parse works
    if (data.content?.[0]?.text) {
      data.content[0].text = data.content[0].text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    }

    console.log("Anthropic status:", response.status);
    console.log("Response preview:", JSON.stringify(data).slice(0, 300));

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Proxy error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}