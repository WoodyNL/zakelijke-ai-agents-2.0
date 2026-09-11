-- Fix incorrect brand name in existing knowledge base seed data: the site is
-- "Zakelijke AI Agents", not "Cadence" (leftover from an earlier draft).
UPDATE public.knowledge_items
SET content = replace(content, 'op cadence-website', 'op de website')
WHERE content LIKE '%cadence-website%';

UPDATE public.knowledge_items
SET
  title = regexp_replace(title, 'Cadence', 'Zakelijke AI Agents', 'g'),
  question = regexp_replace(question, 'Cadence', 'Zakelijke AI Agents', 'g'),
  content = regexp_replace(content, 'Cadence', 'Zakelijke AI Agents', 'g')
WHERE title ~ 'Cadence' OR question ~ 'Cadence' OR content ~ 'Cadence';
