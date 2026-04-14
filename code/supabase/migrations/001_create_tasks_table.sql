-- Create tasks table for naBerza dashboard
-- Run this in Supabase SQL Editor after configuring environment variables

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  note TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  kind TEXT NOT NULL CHECK (kind IN ('persistent', 'normal')),
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'dashboard')),
  due_label TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Allow all public read/write for now
-- (In production, you'd restrict this to authenticated users)
CREATE POLICY "Allow public access" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert demo tasks
INSERT INTO tasks (title, note, priority, kind, channel, due_label, completed)
VALUES
  (
    'Hacer la declaración de la renta',
    'Tarea persistente. Debe recordarse cada mañana hasta marcarla como hecha.',
    'high',
    'persistent',
    'telegram',
    'Cada día · 09:00',
    false
  ),
  (
    'Comprar arnés nuevo para el perro',
    'Pendiente general sin recordatorio diario agresivo.',
    'medium',
    'normal',
    'dashboard',
    'Sin fecha fija',
    false
  ),
  (
    'Definir canales preferidos de aviso',
    'Decidir si los avisos salen por Telegram, email o ambos.',
    'low',
    'normal',
    'dashboard',
    'Próxima iteración',
    true
  );
