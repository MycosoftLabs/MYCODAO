import React from 'react';

interface State {
  error: Error | null;
}

export class PulseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Pulse]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-mono">
          <p className="text-myco-accent font-bold uppercase tracking-widest text-sm mb-4">
            Pulse render error
          </p>
          <pre className="text-xs text-red-300 whitespace-pre-wrap break-all border border-white/10 p-4 bg-black/60">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-6 px-4 py-2 border border-myco-accent text-myco-accent text-xs uppercase"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
