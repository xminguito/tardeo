-- Agregar campo de costo a la tabla activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT 0 NOT NULL;

-- Agregar campo de hora a la tabla activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS time time NOT NULL DEFAULT '18:00:00';

-- Crear índices para mejorar rendimiento de filtros
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_location ON activities(location);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_cost ON activities(cost);