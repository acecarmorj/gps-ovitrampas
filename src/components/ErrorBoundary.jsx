import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('ovitrampas_filtro');
    } catch (_) {}
    window.location.href = '/mapa';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mb-4 border border-rose-500/30">
            ⚠️
          </div>
          <h1 className="text-xl font-black mb-2">Ops! Ocorreu uma instabilidade</h1>
          <p className="text-sm text-slate-300 max-w-md mb-6">
            O aplicativo encontrou um erro inesperado ao carregar este módulo. Seus dados cadastrados estão salvos no aparelho.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer text-sm"
            >
              Recarregar Tela
            </button>
            <button
              onClick={this.handleReset}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-2xl border border-slate-700 transition-all active:scale-95 cursor-pointer text-sm"
            >
              Voltar ao Início
            </button>
          </div>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div className="mt-8 p-4 bg-slate-950/80 rounded-2xl border border-rose-900/50 max-w-lg text-left text-xs text-rose-300 font-mono overflow-auto max-h-40">
              <p className="font-bold">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
