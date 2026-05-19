import { supabaseAdmin } from '../supabase.js';

async function ensureUserProfile(user) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Guest User',
      email: user.email
    }, { onConflict: 'id' });

  return error;
}

export async function createReservation(req, res, next) {
  try {
    const { showtimeId, seatIds } = req.body;
    const profileError = await ensureUserProfile(req.user);

    if (profileError) {
      return res.status(400).json({ message: profileError.message });
    }

    const { data, error } = await supabaseAdmin.rpc('create_reservation', {
      p_user_id: req.user.id,
      p_showtime_id: showtimeId,
      p_seat_ids: seatIds
    });

    if (error) return res.status(409).json({ message: error.message });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function updateReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { showtimeId, seatIds } = req.body;

    const { data, error } = await supabaseAdmin.rpc('update_reservation', {
      p_reservation_id: id,
      p_user_id: req.user.id,
      p_showtime_id: showtimeId || null,
      p_seat_ids: seatIds
    });

    if (error) return res.status(409).json({ message: error.message });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin.rpc('cancel_reservation', {
      p_reservation_id: id,
      p_user_id: req.user.id
    });

    if (error) return res.status(400).json({ message: error.message });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listUserReservations(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select(`
        *,
        showtime:showtimes(*, show:shows(*, theatre:theatres(*))),
        reservation_seats(seat:seats(*))
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
