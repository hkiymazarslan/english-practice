import { NextRequest, NextResponse } from "next/server";

async function callGroq(messages: any[], system: string | undefined, maxTokens: number) {
  const groqKey = process.env.GROQ_KEY;
  if (!groqKey) throw new Error("Groq key not configured");
  const groqMessages = [];
  if (system) groqMessages.push({ role: "system", content: system });
  groqMessages.push(...messages);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Authorization": `Bearer ${groqKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: maxTokens, messages: groqMessages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Groq error");
  return data?.choices?.[0]?.message?.content;
}

async function callGemini(messages: any[], system: string | undefined, maxTokens: number) {
  const geminiKey = process.env.GEMINI_KEY;
  if (!geminiKey) throw new Error("Gemini key not configured");
  const contents = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: any = { contents, generationConfig: { maxOutputTokens: maxTokens } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini error");
  return data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, system, model } = body;
    const maxTokens = 800;

    let text: string;
    if (model === "gemini") {
      text = await callGemini(messages, system, maxTokens);
    } else {
      text = await callGroq(messages, system, maxTokens);
    }

    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 500 });
    return NextResponse.json({ content: [{ text }] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
