import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] font-sans">
          <div className="w-full max-w-lg bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-8 text-center shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000]">
            
            <div className="inline-flex items-center justify-center p-4 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-2xl mb-4 border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717]">
              <AlertOctagon className="h-10 w-10 stroke-[2.5]" />
            </div>

            <h2 className="text-xl font-black text-[#161C2D] dark:text-white mb-2">
              Terjadi Kesalahan pada Tampilan
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 font-semibold leading-relaxed">
              Komponen sistem mengalami kendala saat memuat data. Silakan coba muat ulang halaman atau kembali ke beranda.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-100 dark:bg-[#0B1014] border-2 border-slate-300 dark:border-white/10 rounded-xl text-left text-[11px] font-mono text-rose-600 dark:text-rose-400 mb-6 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/10 hover:bg-slate-100 text-[#161C2D] dark:text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Halaman Utama</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
