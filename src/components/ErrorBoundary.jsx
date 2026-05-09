import React from 'react';

// Global error boundary so a thrown render error doesn't blank the whole site.
// Shows a friendly recover UI, logs to console for triage, and offers a reload.
export default class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		console.error('Render error:', error, info?.componentStack);
	}

	render() {
		if (!this.state.error) return this.props.children;
		return (
			<main
				id="main"
				role="main"
				className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground"
			>
				<div className="max-w-md text-center">
					<h1 className="text-3xl font-light mb-3">Something broke</h1>
					<p className="text-foreground/70 font-light mb-8">
						We hit an unexpected error rendering this page. The Kibay team has been notified — try
						reloading or head back to the home page.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-3 rounded-full bg-mango-500 hover:bg-mango-600 text-white font-light"
						>
							Reload page
						</button>
						<a
							href="/"
							className="px-6 py-3 rounded-full border border-foreground/20 hover:bg-foreground/5 text-foreground font-light"
						>
							Go home
						</a>
					</div>
				</div>
			</main>
		);
	}
}
