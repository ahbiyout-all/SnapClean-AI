import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Download, TerminalSquare } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  crashDump: any | null;
}

import { blobRegistry } from '../utils/blobRegistry';

export class NeuralCrashReporter extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    crashDump: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, crashDump: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Neural Crash Reporter caught an error:', error, errorInfo);
    
    // Generate blackbox crash dump
    let memDump = {};
    const perf = (window.performance as any);
    if (perf && perf.memory) {
       memDump = {
         jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
         totalJSHeapSize: perf.memory.totalJSHeapSize,
         usedJSHeapSize: perf.memory.usedJSHeapSize
       };
    }

    const crashDump = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      error: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      memoryDump: memDump,
      url: window.location.href,
      storageContext: 'IndexedDB / Dexie active'
    };

    (this as any).setState({
      error,
      errorInfo,
      crashDump
    });
  }

  handleDownload = () => {
    if (!this.state.crashDump) return;
    const blob = new Blob([JSON.stringify(this.state.crashDump, null, 2)], { type: 'application/json' });
    const url = blobRegistry.create(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapclean_crash_dump_${Date.now()}.json`;
    a.click();
    blobRegistry.revoke(url);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-mono">
          <div className="max-w-3xl w-full bg-red-950/20 border-2 border-red-500/50 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl pointer-events-none">
               <AlertTriangle size={200} className="text-red-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6 text-red-400">
                <TerminalSquare size={32} />
                <h1 className="text-2xl font-black tracking-widest uppercase">Fatal Runtime Core Panic</h1>
              </div>

              <p className="text-red-300 text-sm mb-6 bg-red-900/30 p-4 rounded-xl border border-red-500/20">
                The Neural Application Sandbox encountered a fatal exception. The execution thread has been isolated to prevent data corruption.
              </p>

              <div className="space-y-4 mb-8">
                <div className="bg-black/50 rounded-xl p-4 border border-white/10 overflow-auto max-h-48 text-xs text-slate-300 whitespace-pre-wrap">
                  <span className="text-red-400 font-bold">Exception:</span> {this.state.error?.message}
                  {'\n\n'}
                  <span className="text-red-400 font-bold">Stack Trace:</span>
                  {this.state.error?.stack}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Hard Reboot Engine
                </button>
                <button
                  onClick={this.handleDownload}
                  className="px-6 py-3 bg-red-500/10 text-red-400 font-bold uppercase tracking-wider rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center gap-2"
                >
                  <Download size={18} />
                  Export Json Dump
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
