"use client";

import React from "react";

type Props = { children: React.ReactNode };

export default class PulseErrorBoundary extends React.Component<
  Props,
  { hasError: boolean }
> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-xl font-bold text-stone-100 mb-2">Market Pulse</h1>
            <p className="text-stone-500 mb-4">Something went wrong. Try refreshing.</p>
            <a href="/pulse" className="text-stone-400 hover:text-stone-300 text-sm">
              Reload
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
