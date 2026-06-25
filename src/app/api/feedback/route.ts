import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { message, email, pageUrl } = await request.json();
    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    const { error } = await supabase.from("feedback").insert({
      message: message.trim().slice(0, 5000),
      email: typeof email === "string" && email ? email.slice(0, 200) : null,
      page_url: typeof pageUrl === "string" ? pageUrl.slice(0, 500) : null,
    });
    if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
