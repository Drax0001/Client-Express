import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that do not require authentication
const publicPaths = new Set([
    "/",
    "/login",
    "/signup",
    "/api/auth",
    "/api/widget",       // Widget API — public
    "/api/payments/webhook", // CamPay webhook needs to be public
    "/api/openapi",      // OpenAPI spec
    "/widget",           // Public chatbot widget
    "/chat",             // Public chatbot full-page
    "/reference",        // API reference docs
]);

// Allow static files and next internals
const publicFile = /\.(.*)$/;

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Let static assets and Next.js internals pass through
    if (publicFile.test(pathname) || pathname.startsWith("/_next")) {
        return NextResponse.next();
    }

    // Check if it's a public route
    if (Array.from(publicPaths).some((path) => pathname.startsWith(path) || pathname === path)) {
        // If user is already logged in, don't let them hit /login or /signup
        if (pathname === "/login" || pathname === "/signup") {
            const token = await getToken({
                req: request,
                secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
            });
            if (token) {
                return NextResponse.redirect(new URL("/projects", request.url));
            }
        }
        return NextResponse.next();
    }

    // ALL OTHER ROUTES REQUIRE AUTHENTICATION
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
        // Return 401 for strictly API routes
        if (pathname.startsWith("/api")) {
            return NextResponse.json(
                { error: "Unauthorized", details: "Authentication required" },
                { status: 401 },
            );
        }
        // Redirect to login for page routes
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
