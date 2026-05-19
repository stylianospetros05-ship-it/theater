import { supabaseAdmin } from '../supabase.js';

function databaseSetupMessage(error) {
  if (
    error?.code === 'PGRST205' ||
    error?.message?.includes('Could not find the table')
  ) {
    return 'Database tables are missing. Run supabase/schema.sql in the Supabase SQL editor, then restart the API.';
  }

  return error.message;
}

export async function listTheatres(req, res, next) {
  try {
    const search = (req.query.search || '').toString().trim();
    let query = supabaseAdmin
      .from('theatres')
      .select('*, shows(id)')
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ message: databaseSetupMessage(error) });
    res.json(data.map((theatre) => ({
      ...theatre,
      show_count: theatre.shows?.length || 0,
      shows: undefined
    })));
  } catch (error) {
    next(error);
  }
}

export async function listShows(req, res, next) {
  try {
    const { theatreId, title, date, location, search } = req.query;
    let query = supabaseAdmin
      .from('shows')
      .select('*, theatre:theatres(*), showtimes(id, starts_at)')
      .order('title', { ascending: true });

    if (theatreId) query = query.eq('theatre_id', theatreId);
    if (title && !search) query = query.ilike('title', `%${title}%`);

    const { data, error } = await query;
    if (error) return res.status(400).json({ message: databaseSetupMessage(error) });

    let shows = data;

    if (search) {
      const needle = search.toString().toLowerCase();
      shows = shows.filter((show) => (
        show.title?.toLowerCase().includes(needle)
        || show.theatre?.name?.toLowerCase().includes(needle)
        || show.theatre?.location?.toLowerCase().includes(needle)
      ));
    }

    if (location) {
      const needle = location.toString().toLowerCase();
      shows = shows.filter((show) => show.theatre?.location?.toLowerCase().includes(needle));
    }

    if (date) {
      const from = `${date}T00:00:00`;
      const to = `${date}T23:59:59`;
      const showIds = shows.map((show) => show.id);
      const showtimes = await supabaseAdmin
        .from('showtimes')
        .select('show_id')
        .in('show_id', showIds.length ? showIds : ['00000000-0000-0000-0000-000000000000'])
        .gte('starts_at', from)
        .lte('starts_at', to);

      if (showtimes.error) return res.status(400).json({ message: databaseSetupMessage(showtimes.error) });
      const idsWithDate = new Set(showtimes.data.map((item) => item.show_id));
      shows = shows.filter((show) => idsWithDate.has(show.id));
    }

    res.json(shows.map((show) => {
      const upcomingShowtimes = (show.showtimes || [])
        .filter((showtime) => new Date(showtime.starts_at) > new Date())
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

      return {
        ...show,
        next_showtime: upcomingShowtimes[0] || null,
        showtime_count: upcomingShowtimes.length,
        showtimes: undefined
      };
    }));
  } catch (error) {
    next(error);
  }
}

export async function listShowtimes(req, res, next) {
  try {
    const { showId } = req.query;
    let query = supabaseAdmin
      .from('showtimes')
      .select('*, show:shows(*, theatre:theatres(*))')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (showId) query = query.eq('show_id', showId);

    const { data, error } = await query;
    if (error) return res.status(400).json({ message: databaseSetupMessage(error) });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function listSeats(req, res, next) {
  try {
    const { showtimeId } = req.query;
    if (!showtimeId) return res.status(400).json({ message: 'showtimeId is required' });

    const { data, error } = await supabaseAdmin.rpc('get_seat_availability', {
      p_showtime_id: showtimeId
    });

    if (error) return res.status(400).json({ message: error.message });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
