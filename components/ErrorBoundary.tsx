"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
                        <p className="text-muted-foreground text-sm max-w-md">
                            {this.state.error?.message || "An unexpected error occurred"}
                        </p>
                    </div>
                    <Button onClick={this.handleReset} variant="default">
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}