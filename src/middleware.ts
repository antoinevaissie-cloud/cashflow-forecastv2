import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    console.log("Middleware called for:", req.nextUrl.pathname);
    console.log("Token exists:", !!req.nextauth.token);
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log("Authorized callback - token:", !!token);
        console.log("Authorized callback - path:", req.nextUrl.pathname);
        return !!token
      }
    },
  }
)

export const config = {
  matcher: ["/receivables/:path*", "/payables/:path*", "/balances/:path*", "/forecast"]
}
