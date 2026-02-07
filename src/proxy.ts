import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = new Set(["/", "/login", "/signup", "/api/auth"]);

const publicFile = /\.(.*)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicFile.test(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (Array.from(publicPaths).some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const authSecret =
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "dev-secret-change-me"
      : undefined);
  const token = await getToken({
    req: request,
    secret: authSecret,
  });

  // if (!token) {
  //   if (pathname.startsWith("/api")) {
  //     return NextResponse.json(
  //       { error: "Unauthorized", details: "Authentication required" },
  //       { status: 401 }
  //     );
  //   }
  //   // const landingUrl = request.nextUrl.clone();
  //   // landingUrl.pathname = "/";
  //   // return NextResponse.redirect(landingUrl);
  // }

  // if ((pathname === "/login" || pathname === "/signup") && token) {
  //   const redirectUrl = request.nextUrl.clone();
  //   redirectUrl.pathname = token.name ? "/projects" : "/onboarding";
  //   return NextResponse.redirect(redirectUrl);
  // }

  // if (
  //   !token.name &&
  //   !pathname.startsWith("/onboarding") &&
  //   !pathname.startsWith("/api")
  // ) {
  //   const onboardingUrl = request.nextUrl.clone();
  //   onboardingUrl.pathname = "/onboarding";
  //   return NextResponse.redirect(onboardingUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
