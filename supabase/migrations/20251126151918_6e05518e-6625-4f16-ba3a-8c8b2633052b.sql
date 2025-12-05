-- Remover coluna project_type e adicionar expected_return_date
ALTER TABLE public.proposals 
DROP COLUMN project_type;

ALTER TABLE public.proposals 
ADD COLUMN expected_return_date timestamp with time zone;

-- Criar índice para melhor performance em ordenação
CREATE INDEX idx_proposals_expected_return_date ON public.proposals(expected_return_date);