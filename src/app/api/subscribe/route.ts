import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();

  if (email) {
    // Ignore duplicate-email errors (unique index); capture everything else.
    await supabase.from("subscribers").insert({ email, source: "site" });
  }

  let back = "/";
  try {
    const referer = req.headers.get("referer");
    if (referer) {
      const url = new URL(referer);
      url.searchParams.set("subscribed", "1");
      back = url.toString();
    }
  } catch {
    back = "/?subscribed=1";
  }
  return NextResponse.redirect(back, 303);
}
