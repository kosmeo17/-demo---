import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;
  private chat: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.chat = this.ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }

  async sendMessage(message: string) {
    const response = await this.chat.sendMessage({ message });
    return response.text;
  }

  async sendMessageStream(message: string, onChunk: (text: string) => void) {
    const result = await this.chat.sendMessageStream({ message });
    for await (const chunk of result) {
      onChunk(chunk.text || "");
    }
  }
}

export const geminiService = new GeminiService();
