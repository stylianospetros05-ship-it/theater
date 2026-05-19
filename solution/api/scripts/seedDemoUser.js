import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

const email = process.env.DEMO_USER_EMAIL || 'demo@example.com';
const password = process.env.DEMO_USER_PASSWORD || 'password123';
const name = process.env.DEMO_USER_NAME || 'Demo User';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (entry) => entry.email?.toLowerCase() === targetEmail.toLowerCase()
    );

    if (user || data.users.length < perPage) {
      return user || null;
    }

    page += 1;
  }
}

async function createOrUpdateDemoUser() {
  const existingUser = await findUserByEmail(email);

  let user = existingUser;

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (error) {
      throw error;
    }

    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (error) {
      throw error;
    }

    user = data.user;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, name, email }, { onConflict: 'id' });

  if (profileError) {
    if (
      profileError.code === 'PGRST205' ||
      profileError.message.includes("Could not find the table 'public.profiles'")
    ) {
      console.warn(`Demo Auth user ready: ${email} / ${password}`);
      console.warn('The public.profiles table is missing. Run supabase/schema.sql, then run this seed command again before testing reservations.');
      return;
    }

    throw profileError;
  }

  console.log(`Demo user ready: ${email} / ${password}`);
}

createOrUpdateDemoUser().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
