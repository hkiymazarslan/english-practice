import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, system } = body;
    const groqKey = process.env.GROQ_KEY;
    if (!groqKey) return NextResponse.json({ error: "Groq key not configured" }, { status: 401 });

    const groqMessages = [];
    if (system) groqMessages.push({ role: "system", content: system });
    groqMessages.push(...messages);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 800, messages: groqMessages }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || "Groq error" }, { status: res.status });

    const text = data?.choices?.[0]?.message?.content;
    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 500 });
    return NextResponse.json({ content: [{ text }] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}