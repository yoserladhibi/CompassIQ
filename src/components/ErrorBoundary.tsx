import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  language?: 'fr' | 'ar';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isAr = this.props.language === 'ar';
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-150 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-brand-crimson mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-brand-blue font-sans">
              {isAr ? "حدث خطأ غير متوقع" : "Une erreur inattendue est survenue"}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed font-sans">
              {isAr 
                ? "واجه محرك العرض مشكلة فنية أثناء تحميل هذا القسم. نوصي بإعادة المحاولة أو تنشيط الصفحة." 
                : "Le moteur de rendu a rencontré un problème technique lors du chargement de cette section. Nous vous conseillons de réessayer."
              }
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-xs hover:bg-opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              {isAr ? "إعادة تحميل الصفحة" : "Recharger la page"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
