import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-[#16161a] border border-neutral-800 rounded-2xl max-w-md mx-auto text-center shadow-2xl text-white">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-[#E03E3E]">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold mb-1">
            화면을 표시하는 중 문제가 발생했습니다
          </h3>
          <p className="text-[13px] text-neutral-400 mb-6 font-mono leading-relaxed">
            {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-xl bg-[#7F6DF2] px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#6855dd]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>다시 시도</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
