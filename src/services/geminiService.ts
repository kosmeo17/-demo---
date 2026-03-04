import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../types";

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chat: any = null;

  private init() {
    if (this.ai) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return;
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.chat = this.ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }

  async sendMessage(message: string) {
    this.init();
    if (!this.chat) throw new Error("AI not initialized");
    const response = await this.chat.sendMessage({ message });
    return response.text;
  }
}

export const geminiService = new GeminiService();
