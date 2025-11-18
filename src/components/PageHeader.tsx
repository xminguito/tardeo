import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  backTo?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  showBackButton?: boolean;
}

export default function PageHeader({ 
  title, 
  icon, 
  backTo, 
  breadcrumbs,
  actions,
  showBackButton = true 
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {showBackButton && backTo && (
            <Button variant="ghost" onClick={() => navigate(backTo)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          )}
          <div className="flex items-center gap-3">
            {icon}
            <h1 className="text-4xl font-bold">{title}</h1>
          </div>
        </div>
        
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
