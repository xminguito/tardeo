import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Filter, X } from 'lucide-react';
import type { ActivityFilters } from '../types/activity.types';

interface ActivityFiltersProps {
  onFiltersChange: (filters: ActivityFilters) => void;
  categories: string[];
}

export function ActivityFiltersComponent({ onFiltersChange, categories }: ActivityFiltersProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ActivityFilters>({});

  const handleApply = () => {
    onFiltersChange(filters);
  };

  const handleClear = () => {
    setFilters({});
    onFiltersChange({});
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-md space-y-4" role="search" aria-label={t('activities.filters.category')}>
      <div className="space-y-2">
        <Label htmlFor="category">{t('activities.filters.category')}</Label>
        <Select
          value={filters.category || ''}
          onValueChange={(value) => setFilters({ ...filters, category: value || null })}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder={t('activities.filters.category')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">{t('activities.filters.location')}</Label>
        <Input
          id="location"
          type="text"
          placeholder={t('activities.filters.location')}
          value={filters.location || ''}
          onChange={(e) => setFilters({ ...filters, location: e.target.value || null })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minCost">{t('activities.filters.priceMin')}</Label>
          <Input
            id="minCost"
            type="number"
            min="0"
            step="0.01"
            value={filters.minCost ?? ''}
            onChange={(e) => setFilters({ ...filters, minCost: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxCost">{t('activities.filters.priceMax')}</Label>
          <Input
            id="maxCost"
            type="number"
            min="0"
            step="0.01"
            value={filters.maxCost ?? ''}
            onChange={(e) => setFilters({ ...filters, maxCost: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="availableOnly"
          checked={filters.availableOnly || false}
          onCheckedChange={(checked) => setFilters({ ...filters, availableOnly: checked })}
        />
        <Label htmlFor="availableOnly">{t('activities.filters.availableOnly')}</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleApply} className="flex-1">
          <Filter className="mr-2 h-4 w-4" />
          {t('activities.filters.apply')}
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <X className="mr-2 h-4 w-4" />
          {t('activities.filters.clear')}
        </Button>
      </div>
    </div>
  );
}
