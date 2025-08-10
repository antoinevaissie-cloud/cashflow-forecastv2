"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Cashflow Manager</h2>
        <p className="text-lg text-gray-600 mb-8">
          Manage your finances with ease. Track receivables, payables, balances, and generate forecasts.
        </p>
        <Link 
          href="/auth/signin" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Sign In to Get Started
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Welcome back, {session.user?.name}!</h2>
      <p className="mt-2 text-gray-600">Use the navigation to manage Receivables, Payables, Balances, and view the Forecast.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/receivables" className="p-6 bg-white rounded-lg border hover:border-blue-200 hover:shadow-sm transition-all">
          <h3 className="font-medium text-gray-900 mb-2">Receivables</h3>
          <p className="text-sm text-gray-600">Track money owed to you</p>
        </Link>
        
        <Link href="/payables" className="p-6 bg-white rounded-lg border hover:border-blue-200 hover:shadow-sm transition-all">
          <h3 className="font-medium text-gray-900 mb-2">Payables</h3>
          <p className="text-sm text-gray-600">Manage bills and expenses</p>
        </Link>
        
        <Link href="/balances" className="p-6 bg-white rounded-lg border hover:border-blue-200 hover:shadow-sm transition-all">
          <h3 className="font-medium text-gray-900 mb-2">Balances</h3>
          <p className="text-sm text-gray-600">Track account balances</p>
        </Link>
        
        <Link href="/forecast" className="p-6 bg-white rounded-lg border hover:border-blue-200 hover:shadow-sm transition-all">
          <h3 className="font-medium text-gray-900 mb-2">Forecast</h3>
          <p className="text-sm text-gray-600">View cashflow projections</p>
        </Link>
      </div>
    </div>
  );
}
