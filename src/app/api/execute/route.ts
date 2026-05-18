import { NextResponse } from "next/server";
import { executePrompt } from "../../../lib/agent/runtime";

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt bos olamaz." },
      { status: 400 }
    );
  }

  return NextResponse.json(executePrompt(prompt));
}
