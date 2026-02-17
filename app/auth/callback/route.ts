import { createServerClient } from "@supabase/ssr";
import { getOAuthRedirectPath } from "@/lib/auth/provider";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";

/**
 * Handles the OAuth callback from Supabase GoTrue.
 * GoTrue redirects here with tokens in the URL hash fragment (implicit flow).
 * Since hash fragments aren't sent to the server, this page serves as 
 * a landing point where the client-side Supabase SDK can process the tokens.
 * 
 * If using PKCE flow (code in query params), this route exchanges the code.
 */
export async function GET(request: NextRequest) {
    // Static export build: return placeholder to avoid request.headers usage
    if (process.env.NEXT_PUBLIC_IS_STATIC === "true") {
        return NextResponse.json(
            { error: "Not available in static export mode" },
            { status: 405 }
        );
    }

    const forwardedHostRaw = request.headers.get("x-forwarded-host");
    const forwardedProtoRaw = request.headers.get("x-forwarded-proto");
    const hostRaw = request.headers.get("host");

    const forwardedHost = forwardedHostRaw?.split(",")[0]?.trim();
    const forwardedProto = forwardedProtoRaw?.split(",")[0]?.trim();
    const host = forwardedHost || hostRaw || request.nextUrl.host;
    const proto = forwardedProto || request.nextUrl.protocol.replace(":", "");
    const origin = `${proto}://${host}`;

    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");
    const errorDescription = requestUrl.searchParams.get("error_description");

    if (code) {
        const response = NextResponse.redirect(new URL("/", origin));

        const supabase = createServerClient(
            process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookieOptions: getSupabaseCookieOptions(),
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        await supabase.auth.exchangeCodeForSession(code);

        // Sync profile from directory service (fire-and-forget)
        const { data: { user: authedUser } } = await supabase.auth.getUser();
        if (authedUser?.email) {
            fetch(`${origin}/api/auth/sync-profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: request.headers.get("cookie") || "",
                },
            }).catch((err) =>
                console.error("[Callback] sync-profile failed:", err),
            );
        }

        return response;
    }

    // If no code is present, Supabase may have returned tokens in URL hash fragment.
    // Route handlers cannot access fragments, so we process the hash on the callback page
    // and post tokens to /api/auth/session to set server/browser cookies before redirecting home.
    const loginUrl = `${origin}/login`;
    const homeUrl = `${origin}/`;
    const sessionUrl = `${origin}/api/auth/session`;
    const syncProfileUrl = `${origin}/api/auth/sync-profile`;
    const callbackPath = getOAuthRedirectPath();

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Auth Callback</title>
  </head>
  <body>
    <script>
      (function () {
        var loginUrl = ${JSON.stringify(loginUrl)};
        var homeUrl = ${JSON.stringify(homeUrl)};
        var sessionUrl = ${JSON.stringify(sessionUrl)};
        var syncProfileUrl = ${JSON.stringify(syncProfileUrl)};
        var callbackPath = ${JSON.stringify(callbackPath)};
        var hash = window.location.hash || "";
        var search = window.location.search || "";

        if (hash && hash.indexOf("access_token=") !== -1) {
          var params = new URLSearchParams(hash.substring(1));
          var accessToken = params.get("access_token");
          var refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            fetch(sessionUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken
              })
            })
              .then(function (res) {
                if (!res.ok) throw new Error("Session exchange failed");
                return fetch(syncProfileUrl, { method: "POST", credentials: "include" });
              })
              .then(function () {
                window.history.replaceState(null, "", callbackPath);
                window.location.replace(homeUrl);
              })
              .catch(function () {
                window.location.replace(loginUrl + hash);
              });
            return;
          }
        }

        if (hash) {
          window.location.replace(loginUrl + hash);
          return;
        }

        if (search) {
          window.location.replace(loginUrl + search);
          return;
        }

        window.location.replace(homeUrl);
      })();
    </script>
  </body>
</html>`;

    const headers = new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
    });

    // Keep auth errors visible in /login query string.
    if (error) {
        const errorUrl = new URL(loginUrl);
        errorUrl.searchParams.set("error", error);
        if (errorDescription) {
            errorUrl.searchParams.set("error_description", errorDescription);
        }
        return NextResponse.redirect(errorUrl, { status: 302, headers });
    }

    return new NextResponse(html, { status: 200, headers });
}
