/**
 * Jest global setup - sets test environment variables so the config module validates successfully.
 */
process.env['NODE_ENV'] = 'test';
process.env['SUPABASE_URL'] = process.env['SUPABASE_URL'] ?? 'https://test.supabase.co';
process.env['SUPABASE_ANON_KEY'] = process.env['SUPABASE_ANON_KEY'] ?? 'test-anon-key';
process.env['SUPABASE_SERVICE_ROLE_KEY'] =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? 'test-service-role-key';
process.env['OPENAI_API_KEY'] = process.env['OPENAI_API_KEY'] ?? 'test-openai-key';
process.env['HUBSPOT_ACCESS_TOKEN'] = process.env['HUBSPOT_ACCESS_TOKEN'] ?? 'test-hubspot-token';
