import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function findAuthorPhoto() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Busca una URL de imagen pública y profesional de Jose Ramón Fernández de la Cigoña Fraga. Preferiblemente de LinkedIn o un sitio de noticias profesional. Si no encuentras una directa, busca su perfil de LinkedIn y trata de obtener la URL de la foto de perfil o una imagen corporativa asociada.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
}
