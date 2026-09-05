import React from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLocation } from "react-router";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  routeName?: string;
}

/**
 * RouteErrorBoundary wraps individual routes or route groups so that if one page fails,
 * it displays an elegant recovery UI with Retry and Navigate back to Dashboard actions
 * without crashing the surrounding application navigation.
 */
export function RouteErrorBoundary({ children, routeName }: RouteErrorBoundaryProps) {
  const location = useLocation();

  return (
    <ErrorBoundary
      name={routeName || `Route:${location.pathname}`}
      key={location.pathname}
    >
      {children}
    </ErrorBoundary>
  );
}
