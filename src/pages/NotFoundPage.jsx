import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
	const { t } = useTranslation('notFound');
	return (
		<>
			<Helmet>
				<title>{t('seo.title')}</title>
				<meta name="robots" content="noindex,follow" />
			</Helmet>
			<Navigation />
			<main
				id="main"
				role="main"
				className="min-h-screen bg-background flex items-center justify-center px-4 pt-32 pb-20"
			>
				<div className="max-w-lg text-center">
					<p className="text-mango-400 uppercase tracking-widest text-xs mb-4">{t('label')}</p>
					<h1 className="text-4xl sm:text-5xl font-light text-foreground mb-4">
						{t('h1')}
					</h1>
					<p className="text-foreground/60 font-light mb-10 leading-relaxed">
						{t('body')}
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link to="/">
							<Button className="bg-mango-500 hover:bg-mango-600 text-white font-light px-8 py-6">
								{t('actions.home')}
							</Button>
						</Link>
						<Link to="/shop">
							<Button
								variant="outline"
								className="border-foreground/20 text-foreground font-light px-8 py-6"
							>
								{t('actions.shop')}
							</Button>
						</Link>
						<Link to="/blog">
							<Button
								variant="outline"
								className="border-foreground/20 text-foreground font-light px-8 py-6"
							>
								{t('actions.blog')}
							</Button>
						</Link>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
};

export default NotFoundPage;
