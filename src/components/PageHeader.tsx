import { ReactNode } from 'react';
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export default function PageHeader({ 
  title, 
  icon, 
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="text-4xl font-bold">{title}</h1>
        </div>
        
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
