import { NextResponse } from "next/server";

export function middleware() {
  // No-op middleware; reserved for future auth or logging
  return NextResponse.next();
}
export const config = {
  matcher: ["/receivables/:path*", "/payables/:path*", "/balances/:path*", "/forecast"],
};
