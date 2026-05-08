'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class PostContentBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('PostContent render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-edge bg-card px-6 py-10 text-center my-8">
          <p className="text-sm font-medium text-ink mb-1">Content unavailable</p>
          <p className="text-xs text-muted">
            This post&apos;s content could not be rendered. The raw data may be corrupted.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
