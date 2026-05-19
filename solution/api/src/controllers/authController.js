import { supabaseAdmin, supabasePublic } from '../supabase.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (created.error) {
      return res.status(400).json({ message: created.error.message });
    }

    const user = created.data.user;

    const profile = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user.id, name, email }, { onConflict: 'id' })
      .select('id, name, email')
      .single();

    if (profile.error) {
      return res.status(400).json({ message: profile.error.message });
    }

    const session = await supabasePublic.auth.signInWithPassword({ email, password });
    if (session.error) {
      return res.status(201).json({ user: profile.data, session: null });
    }

    res.status(201).json({ user: profile.data, session: session.data.session });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ message: error.message });
    }

    const profile = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: profile.data || {
        id: data.user.id,
        name: data.user.user_metadata?.name || '',
        email: data.user.email
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshSession(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const { data, error } = await supabasePublic.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session || !data.user) {
      return res.status(401).json({ message: error?.message || 'Could not refresh session' });
    }

    const profile = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: profile.data || {
        id: data.user.id,
        name: data.user.user_metadata?.name || '',
        email: data.user.email
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
}
