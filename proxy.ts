import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { hasActiveAccess } from "@/lib/auth/subscriptions";
import { getPublicEnv } from "@/lib/env";

const protectedAppRoutes = [
  "/dashboard",
  "/store-profile",
  "/financial-settings",
  "/fixed-costs",
  "/ingredients",
  "/products",
  "/combos",
  "/simulator",
];
const authRequiredRoutes = [
  ...protectedAppRoutes,
  "/onboarding",
  "/billing",
  "/admin/payments",
];
const adminRoutes = ["/admin/payments"];
const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRequiredRoute = authRequiredRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isProtectedAppRoute = protectedAppRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRequiredRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return response;
  }

  if (isAdminRoute) {
    const { data: isAdmin } = await supabase.rpc("is_admin");

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (isAuthRequiredRoute) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .maybeSingle();

    if (!business) {
      if (pathname.startsWith("/onboarding")) {
        return response;
      }

      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/billing") || pathname.startsWith("/onboarding")) {
      return response;
    }

    if (isProtectedAppRoute) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, paid_until")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!hasActiveAccess(subscription)) {
        const url = request.nextUrl.clone();
        url.pathname = "/billing";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
