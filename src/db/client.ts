import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { createLogger } from '../logger';

const log = createLogger('db');

// ─── Supabase Clients ─────────────────────────────────────────────────────────

let _anonClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client using the anon key (for client-side / auth flows).
 */
export function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
    log.debug('Supabase anon client initialised');
  }
  return _anonClient;
}

/**
 * Returns a Supabase client using the service-role key (for server-side ops).
 * WARNING: Never expose this token to the client.
 */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    log.debug('Supabase service client initialised');
  }
  return _serviceClient;
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkDbHealth(): Promise<boolean> {
  try {
    const client = getServiceClient();
    const { error } = await client.from('scrape_jobs').select('id').limit(1);
    if (error) {
      log.warn('DB health check failed', { error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    log.error('DB health check threw', { err });
    return false;
  }
}

export default { getAnonClient, getServiceClient, checkDbHealth };
