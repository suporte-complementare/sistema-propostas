import { createClient } from '@supabase/supabase-js';

// Tenta pegar as chaves do ambiente (Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação de segurança para te avisar se faltar algo
if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO CRÍTICO: As chaves do Supabase não foram encontradas!");
  console.error("Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão nas Variáveis de Ambiente.");
}

// Cria a conexão
export const supabase = createClient(supabaseUrl, supabaseKey);
