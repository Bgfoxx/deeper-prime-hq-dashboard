import { NextResponse } from "next/server";
import { readDraftFile, writeDraftFileWithBackup } from "@/lib/data";

const VALID_FORMATS = ["research", "youtube", "linkedin", "twitter", "instagram", "email"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pieceId = searchParams.get("pieceId");
  const format = searchParams.get("format");

  if (!pieceId || !format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Invalid pieceId or format" }, { status: 400 });
  }

  const content = await readDraftFile(pieceId, format);
  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { pieceId, format, content } = body;

  if (!pieceId || !format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Invalid pieceId or format" }, { status: 400 });
  }

  await writeDraftFileWithBackup(pieceId, format, content ?? "");
  return NextResponse.json({ ok: true });
}
