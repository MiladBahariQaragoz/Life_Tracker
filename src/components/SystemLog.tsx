import { useState, useEffect } from 'react';
import { Terminal, X, Database, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type Log = {
    id: string;
    timestamp: Date;
    type: 'info' | 'error' | 'success' | 'warning';
    source: 'system' | 'db' | 'ai';
    message: string;
};

export function SystemLog() {
    const [isOpen, setIsOpen] = useState(false); // Closed by default to not annoy, user can open
    const [logs, setLogs] = useState<Log[]>([]);
    const [status, setStatus] = useState({
        backend: 'unknown', // unknown, connected, disconnected
        ai: 'unknown'
    });

    const addLog = (message: string, type: Log['type'] = 'info', source: Log['source'] = 'system') => {
        setLogs(prev => [
            { id: crypto.randomUUID(), timestamp: new Date(), type, source, message },
            ...prev.slice(0, 49) // Keep last 50
        ]);
    };

    // Poll for basic connectivity
    useEffect(() => {
        const checkHealth = async () => {
            // We'll assume if any API call works, backend is up.
            // Ideally we add a /health endpoint.
            try {
                // Using init data as a "ping"
                // const start = Date.now();
                const res = await api.getInitData();
                // const latency = Date.now() - start;

                if (res) {
                    setStatus(s => ({ ...s, backend: 'connected' }));
                    // Only log heartbeat if it was previously disconnected or every X times? 
                    // To keep log clean, maybe don't log every success heartbeat.
                    // addLog(`Backend Heartbeat: ${latency}ms`, 'success', 'db');
                } else {
                    throw new Error("API returned null data");
                }
            } catch (e) {
                setStatus(s => ({ ...s, backend: 'disconnected' }));
                addLog(`Backend Disconnected: ${String(e)}`, 'error', 'db');
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    // Listen to global events or console overrides if we wanted, 
    // but for now we'll just expose a global function or use a custom event.
    useEffect(() => {
        const handleCustomLog = (e: CustomEvent) => {
            const { message, type, source } = e.detail;
            addLog(message, type, source);
        };
        window.addEventListener('system-log' as any, handleCustomLog);
        return () => window.removeEventListener('system-log' as any, handleCustomLog);
    }, []);

    return (
        <>
            {/* Minimized Status Bar */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-0 left-0 right-0 z-[100] h-8 bg-zinc-950/90 border-t border-zinc-800 flex items-center px-4 gap-4 text-xs font-mono cursor-pointer hover:bg-zinc-900 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-500">SYSTEM LOGS</span>
                </div>

                <div className="h-4 w-px bg-zinc-800" />

                <div className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-zinc-600" />
                    <span className={cn(
                        "font-bold",
                        status.backend === 'connected' ? "text-emerald-500" : status.backend === 'disconnected' ? "text-rose-500" : "text-zinc-500"
                    )}>
                        DB: {status.backend.toUpperCase()}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3 text-zinc-600" />
                    <span className={cn(
                        "font-bold",
                        // We don't really know AI status until we try
                        "text-zinc-500"
                    )}>
                        AI: READY
                    </span>
                </div>

                <div className="flex-1" />
                {logs.length > 0 && (
                    <span className="text-zinc-400 truncate max-w-[200px]">
                        {logs[0].message}
                    </span>
                )}
            </div>

            {/* Expanded Logs Panel */}
            {isOpen && (
                <div className="fixed bottom-8 left-0 right-0 z-[100] h-64 bg-zinc-950 border-t border-zinc-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-800">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-2">Console Output</span>
                        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
                        {logs.map(log => (
                            <div key={log.id} className="flex gap-3 text-zinc-300">
                                <span className="text-zinc-600 shrink-0 select-none">
                                    {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={cn(
                                    "uppercase font-bold shrink-0 w-16",
                                    log.type === 'error' && "text-rose-500",
                                    log.type === 'warning' && "text-amber-500",
                                    log.type === 'success' && "text-emerald-500",
                                    log.type === 'info' && "text-blue-500",
                                )}>
                                    [{log.source}]
                                </span>
                                <span className={cn(
                                    "break-all",
                                    log.type === 'error' && "text-rose-400"
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-zinc-700 italic">No logs recorded yet...</div>}
                    </div>
                </div>
            )}
        </>
    );
}

// Helper to emit logs from anywhere
export const logEvent = (message: string, type: Log['type'] = 'info', source: Log['source'] = 'system') => {
    const event = new CustomEvent('system-log', { detail: { message, type, source } });
    window.dispatchEvent(event);
};
