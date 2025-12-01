import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Filter, X, MapPin, Tag, Euro, Users, Calendar } from 'lucide-react';
import type { ActivityFilters } from '../types/activity.types';

interface ActivityFiltersProps {
  onFiltersChange: (filters: ActivityFilters) => void;
  categories: string[];
  initialFilters?: ActivityFilters;
}

export function ActivityFiltersComponent({ onFiltersChange, categories, initialFilters }: ActivityFiltersProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ActivityFilters>(initialFilters || {});

  // Sync with initial filters when they change (from URL)
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleApply = () => {
    onFiltersChange(filters);
  };

  const handleClear = () => {
    setFilters({});
    onFiltersChange({});
  };

  const removeFilter = (key: keyof ActivityFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Get active filters for display
  const getActiveFilters = () => {
    const active: { key: keyof ActivityFilters; label: string; value: string; icon: React.ReactNode }[] = [];
    
    if (filters.category) {
      active.push({ 
        key: 'category', 
        label: t('activities.filters.category'), 
        value: filters.category,
        icon: <Tag className="h-3 w-3" />
      });
    }
    if (filters.location) {
      active.push({ 
        key: 'location', 
        label: t('activities.filters.location'), 
        value: filters.location,
        icon: <MapPin className="h-3 w-3" />
      });
    }
    if (filters.dateFrom) {
      active.push({ 
        key: 'dateFrom', 
        label: t('activities.filters.dateFrom'), 
        value: filters.dateFrom.toLocaleDateString(),
        icon: <Calendar className="h-3 w-3" />
      });
    }
    if (filters.dateTo) {
      active.push({ 
        key: 'dateTo', 
        label: t('activities.filters.dateTo'), 
        value: filters.dateTo.toLocaleDateString(),
        icon: <Calendar className="h-3 w-3" />
      });
    }
    if (filters.minCost !== null && filters.minCost !== undefined) {
      active.push({ 
        key: 'minCost', 
        label: t('activities.filters.priceMin'), 
        value: `${filters.minCost}€`,
        icon: <Euro className="h-3 w-3" />
      });
    }
    if (filters.maxCost !== null && filters.maxCost !== undefined) {
      active.push({ 
        key: 'maxCost', 
        label: t('activities.filters.priceMax'), 
        value: `${filters.maxCost}€`,
        icon: <Euro className="h-3 w-3" />
      });
    }
    if (filters.availableOnly) {
      active.push({ 
        key: 'availableOnly', 
        label: t('activities.filters.availableOnly'), 
        value: '',
        icon: <Users className="h-3 w-3" />
      });
    }
    
    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="space-y-4">
      {/* Active Filters Tags */}
      {activeFilters.length > 0 && (
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t('activities.filters.activeFilters', 'Filtros activos')}</span>
            <Badge variant="secondary" className="ml-auto">{activeFilters.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge 
                key={filter.key} 
                variant="outline" 
                className="flex items-center gap-1.5 py-1.5 px-3 bg-background hover:bg-destructive/10 cursor-pointer transition-colors group"
                onClick={() => removeFilter(filter.key)}
              >
                {filter.icon}
                <span className="font-medium">{filter.value || filter.label}</span>
                <X className="h-3 w-3 ml-1 text-muted-foreground group-hover:text-destructive" />
              </Badge>
            ))}
            {activeFilters.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                {t('activities.filters.clearAll', 'Limpiar todo')}
              </Button>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
