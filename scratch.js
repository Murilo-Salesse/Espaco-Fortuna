const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await sb.rpc('exec_sql', { query: `
    ALTER TABLE configuracao ADD COLUMN IF NOT EXISTS ponto_referencia text;
  `});
  console.log(data, error);
})();
