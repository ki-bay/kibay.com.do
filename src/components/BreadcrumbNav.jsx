import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import SchemaMarkup from './SchemaMarkup';

const BreadcrumbNav = ({ items }) => {
  // Always start with Home
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    ...items
  ];

  return (
    <>
      <SchemaMarkup type="BreadcrumbList" data={{ items: breadcrumbs }} />
      
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center space-x-2 text-sm text-white/60">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-white/40" />}
                
                {isLast ? (
                  <span className="text-mango-400 font-medium truncate max-w-[200px] md:max-w-none" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link 
                    to={item.url} 
                    className="hover:text-white transition-colors flex items-center"
                  >
                    {index === 0 && <Home className="w-3 h-3 mr-1" />}
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default BreadcrumbNav;