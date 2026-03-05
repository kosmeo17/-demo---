import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  console.log("Environment variables keys:", Object.keys(process.env).filter(k => !k.includes("SECRET") && !k.includes("KEY")));
  console.log("Is GEMINI_API_KEY present?", !!process.env.GEMINI_API_KEY);

  // Gemini API Route
  app.post("/api/chat", async (req, res) => {
    console.log("Received chat request");
    try {
      const { message, history, systemInstruction } = req.body;
      
      // Try multiple common environment variable names and clean the value
      const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
      const apiKey = rawKey?.replace(/["']/g, "").trim();

      if (!apiKey) {
        console.error("No API key found in environment variables (checked GEMINI_API_KEY, GOOGLE_API_KEY, VITE_GEMINI_API_KEY)");
        return res.status(500).json({ error: "API Key is not configured on the server. Please set GEMINI_API_KEY in your environment variables." });
      }

      console.log("Using API Key (cleaned, first 4 chars):", apiKey.substring(0, 4) + "...");

      const ai = new GoogleGenAI({ apiKey });
      
      // We'll try the recommended model first, but provide a fallback if the key doesn't have access
      const modelsToTry = ["gemini-3-flash-preview", "gemini-1.5-flash"];
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting with model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: history.map((msg: any) => ({
              role: msg.role === "ai" ? "model" : "user",
              parts: [{ text: msg.text }],
            })).concat([{ role: "user", parts: [{ text: message }] }]),
            config: {
              systemInstruction: systemInstruction,
            }
          });

          if (response.text) {
            console.log(`Success with model: ${modelName}`);
            return res.json({ text: response.text });
          }
        } catch (err: any) {
          console.error(`Error with model ${modelName}:`, err.message);
          lastError = err;
          // If it's an API key error, trying another model won't help, so we break early
          if (err.message?.includes("API key not valid") || err.message?.includes("API_KEY_INVALID")) {
            break;
          }
          continue;
        }
      }

      // If we get here, all models failed or the first one failed with an invalid key
      throw lastError || new Error("Failed to generate content from all attempted models");

    } catch (error: any) {
      console.error("Gemini API Final Error:", error);
      // Return a clean error message to the frontend
      let message = error.message || "Internal Server Error";
      try {
        // If the error message is a JSON string from the API, try to parse it for a cleaner display
        const parsed = JSON.parse(message);
        if (parsed.error?.message) message = parsed.error.message;
      } catch (e) {
        // Not JSON, keep original
      }
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default startServer;
