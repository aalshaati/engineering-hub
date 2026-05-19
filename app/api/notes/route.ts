import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const VAULT = process.env.OBSIDIAN_VAULT_PATH!;

const FOLDERS = [
  { id: "00_Daily_Notes", label: "Daily Notes" },
  { id: "01_Projects", label: "Projects" },
  { id: "02_Concepts", label: "Concepts" },
];

export async function GET() {
  try {
    const notes = await Promise.all(
      FOLDERS.map(async (folder) => {
        const dir = path.join(VAULT, folder.id);
        const files = await fs.readdir(dir);
        const mdFiles = files.filter((f) => f.endsWith(".md"));

        return Promise.all(
          mdFiles.map(async (file) => {
            const stat = await fs.stat(path.join(dir, file));
            return {
              name: file.replace(/\.md$/, ""),
              file,
              folder: folder.id,
              folderLabel: folder.label,
              modifiedAt: stat.mtime.toISOString(),
            };
          })
        );
      })
    );

    const flat = notes
      .flat()
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

    return NextResponse.json(flat);
  } catch {
    return NextResponse.json({ error: "Failed to read vault" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, folder, content } = await req.json();

    if (!title?.trim() || !folder) {
      return NextResponse.json({ error: "Title and folder are required" }, { status: 400 });
    }

    const filename = `${title.trim()}.md`;
    const filepath = path.join(VAULT, folder, filename);

    await fs.writeFile(filepath, content ?? "", "utf-8");

    return NextResponse.json({ ok: true, file: filename });
  } catch {
    return NextResponse.json({ error: "Failed to write note" }, { status: 500 });
  }
}
