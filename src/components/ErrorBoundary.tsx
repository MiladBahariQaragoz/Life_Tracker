import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-zinc-950 text-white min-h-screen flex flex-col items-center justify-center font-mono">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">System Critical Failure</h1>
                    <div className="bg-zinc-900 p-6 rounded-lg border border-red-900/50 max-w-3xl w-full overflow-hidden shadow-2xl">
                        <p className="text-zinc-400 mb-2 border-b border-zinc-800 pb-2">Error Log:</p>
                        <pre className="text-sm text-red-400 overflow-auto whitespace-pre-wrap break-words font-mono">
                            {this.state.error?.toString()}
                            {this.state.error?.stack}
                        </pre>
                    </div>
                    <div className="mt-8 flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                        >
                            Retry Connection
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded transition-colors"
                        >
                            Hard Reset (Clear Storage)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
