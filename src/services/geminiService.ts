import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getAuthorInfo() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Busca información profesional detallada sobre José Ramón Fernández de la Cigüeña Fraga. Incluye su experiencia laboral, educación, áreas de especialización (finanzas, contabilidad, laboral) y cualquier publicación o logro relevante. Resume la información para usarla en su página web personal.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
}
