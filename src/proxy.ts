import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { decideCanonical, isNoindexPath, isPreviewHost, hostnameOf } from "@/lib/seoIndexing";

// Next 16 "proxy" (formerly middleware): one-hop host/slash canonicalization,
// preview noindex, then refresh the Supabase auth token so Server Components
// see a valid session. Auth failures must never 5xx a public page.
export async function proxy(request: NextRequest) {
  const host = hostnameOf(request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host);
  const decision = decideCanonical(host, request.nextUrl.pathname, request.nextUrl.search, request.nextUrl.origin);
  if (decision.redirect) {
    return NextResponse.redirect(decision.redirect, decision.status);
  }

  let response = NextResponse.next({ request });
  if (isPreviewHost(host) || isNoindexPath(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          if (isPreviewHost(host) || isNoindexPath(request.nextUrl.pathname)) {
            response.headers.set("X-Robots-Tag", "noindex, nofollow");
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    await supabase.auth.getUser();
  } catch {
    // Missing/invalid session or a transient Supabase error — serve the page.
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|wp-content|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|woff2?)$).*)",
  ],
};
