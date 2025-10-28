import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Middleware authorization callback that runs on each request
    //authorized({ auth, request: { nextUrl } }) {
    authorized(params) {
      const isLoggedIn = !!params.auth?.user;
      const isOnDashboard = params.request.nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', params.request.nextUrl));
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;

/**
  Browser Request
      ↓
  middleware (proxy.ts) - Uses NextAuth(authConfig).auth
      ↓
  Checks: Is user authenticated?
      ↓
  Runs: authorized() callback from authConfig
      ↓
  Decision:
      - /dashboard + not logged in → redirect to /login
      - /login + logged in → redirect to /dashboard  
      - Otherwise → allow request through
      ↓
  Page renders
 */