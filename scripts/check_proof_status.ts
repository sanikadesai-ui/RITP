
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const { data, error } = await supabase
  .from('fest_registrations')
  .select('proof_status, count')
  .select('proof_status')

if (error) {
  console.error(error)
} else {
    // Count occurrences manually since we can't do group by easily with simple select
    const counts = {}
    data.forEach(row => {
        const status = row.proof_status || 'null'
        counts[status] = (counts[status] || 0) + 1
    })
    console.log('Proof Status Counts:', counts)
}
