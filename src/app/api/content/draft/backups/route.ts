import { NextResponse } from "next/server";
import { listDraftBackups, readDraftBackup } from "@/lib/data";

const VALID_FORMATS = ["research", "youtube", "linkedin", "twitter", "instagram", "email"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pieceId = searchParams.get("pieceId");
  const format = searchParams.get("format");
  const filename = searchParams.get("filename");

  // Read a specific backup file
  if (filename) {
    const content = await readDraftBackup(filename);
    return NextResponse.json({ content });
  }

  // List backups for a piece+format
  if (!pieceId || !format || !VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const backups = await listDraftBackups(pieceId, format);
  return NextResponse.json({ backups });
}
