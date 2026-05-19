import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

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

const theatres = [
  {
    key: 'galaxy',
    name: 'Galaxy Cinema',
    location: 'Athens Mall',
    description: 'Modern multiplex cinema with family screenings, premium sound and reserved numbered seats.',
    image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'
  },
  {
    key: 'premiere',
    name: 'Premiere Hall',
    location: 'Syntagma',
    description: 'Premium central cinema for major releases, biopics and late-night screenings.',
    image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80'
  }
];

const movies = [
  {
    theatreKey: 'galaxy',
    title: 'The Super Mario Galaxy Movie',
    description: 'Mario and Luigi blast off on a colorful galaxy adventure with Princess Peach, Bowser and new cosmic worlds.',
    duration_minutes: 98,
    age_rating: 'PG',
    genre: 'Animation / Adventure / Comedy',
    language: 'English / Greek subtitles',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/The_Super_Mario_Galaxy_Movie_poster.jpeg/250px-The_Super_Mario_Galaxy_Movie_poster.jpeg',
    showtimes: [
      { hall: 'Galaxy Screen 1', offsetDays: 2, hour: 18 },
      { hall: 'Galaxy Screen 1', offsetDays: 4, hour: 20 },
      { hall: 'Family Screen', offsetDays: 6, hour: 17 }
    ]
  },
  {
    theatreKey: 'premiere',
    title: 'Oppenheimer',
    description: "Christopher Nolan's biographical thriller about J. Robert Oppenheimer and the creation of the atomic bomb.",
    duration_minutes: 181,
    age_rating: 'R',
    genre: 'Biographical Thriller / Drama',
    language: 'English / Greek subtitles',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/250px-Oppenheimer_%28film%29.jpg',
    showtimes: [
      { hall: 'Premiere IMAX', offsetDays: 3, hour: 21 },
      { hall: 'Premiere IMAX', offsetDays: 7, hour: 20 }
    ]
  },
  {
    theatreKey: 'premiere',
    title: 'Michael',
    description: 'A Michael Jackson biopic starring Jaafar Jackson, following the life and legacy of the King of Pop.',
    duration_minutes: 127,
    age_rating: 'PG-13',
    genre: 'Music Biopic / Drama',
    language: 'English / Greek subtitles',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Michael_%282026_film_poster%29.png/250px-Michael_%282026_film_poster%29.png',
    showtimes: [
      { hall: 'Premiere Hall A', offsetDays: 5, hour: 19 },
      { hall: 'Premiere Hall A', offsetDays: 8, hour: 21 }
    ]
  }
];

function futureDate(offsetDays, hour) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function tableExists(table) {
  const { error } = await supabase.from(table).select('id').limit(1);

  if (!error) return true;
  if (error.code === 'PGRST205' || error.message.includes(`Could not find the table 'public.${table}'`)) {
    return false;
  }

  throw error;
}

async function upsertTheatre(theatre) {
  const existing = await supabase
    .from('theatres')
    .select('id')
    .eq('name', theatre.name)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    const updated = await supabase
      .from('theatres')
      .update({
        location: theatre.location,
        description: theatre.description,
        image_url: theatre.image_url
      })
      .eq('id', existing.data.id)
      .select('id')
      .single();

    if (updated.error) throw updated.error;
    return updated.data.id;
  }

  const created = await supabase
    .from('theatres')
    .insert(theatre)
    .select('id')
    .single();

  if (created.error) throw created.error;
  return created.data.id;
}

async function upsertMovie(movie, theatreId) {
  const payload = {
    theatre_id: theatreId,
    title: movie.title,
    description: movie.description,
    duration_minutes: movie.duration_minutes,
    age_rating: movie.age_rating,
    genre: movie.genre,
    language: movie.language,
    image_url: movie.image_url
  };

  const existing = await supabase
    .from('shows')
    .select('id')
    .eq('title', movie.title)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    const updated = await supabase
      .from('shows')
      .update(payload)
      .eq('id', existing.data.id)
      .select('id')
      .single();

    if (updated.error) throw updated.error;
    return updated.data.id;
  }

  const created = await supabase
    .from('shows')
    .insert(payload)
    .select('id')
    .single();

  if (created.error) throw created.error;
  return created.data.id;
}

async function ensureShowtimes(movie, showId) {
  const existing = await supabase
    .from('showtimes')
    .select('id')
    .eq('show_id', showId)
    .gt('starts_at', new Date().toISOString());

  if (existing.error) throw existing.error;
  if (existing.data.length > 0) return existing.data.map((item) => item.id);

  const created = await supabase
    .from('showtimes')
    .insert(movie.showtimes.map((showtime) => ({
      show_id: showId,
      hall: showtime.hall,
      starts_at: futureDate(showtime.offsetDays, showtime.hour)
    })))
    .select('id');

  if (created.error) throw created.error;
  return created.data.map((item) => item.id);
}

async function ensureSeats(showtimeId) {
  const existing = await supabase
    .from('seats')
    .select('id')
    .eq('showtime_id', showtimeId)
    .limit(1);

  if (existing.error) throw existing.error;
  if (existing.data.length > 0) return;

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seats = rows.flatMap((row) => (
    Array.from({ length: 12 }, (_, index) => {
      const seatNumber = index + 1;
      const category = row === 'A' ? 'VIP' : ['B', 'C'].includes(row) ? 'Premium' : 'Standard';
      const price = row === 'A' ? 14 : ['B', 'C'].includes(row) ? 11 : 8;

      return {
        showtime_id: showtimeId,
        row_label: row,
        seat_number: seatNumber,
        category,
        price
      };
    })
  ));

  const inserted = await supabase.from('seats').insert(seats);
  if (inserted.error) throw inserted.error;
}

async function seedMovies() {
  const hasTheatres = await tableExists('theatres');
  const hasShows = await tableExists('shows');
  const hasShowtimes = await tableExists('showtimes');
  const hasSeats = await tableExists('seats');

  if (!hasTheatres || !hasShows || !hasShowtimes || !hasSeats) {
    throw new Error('Database tables are missing. Run supabase/schema.sql in the Supabase SQL editor first.');
  }

  const theatreIds = {};

  for (const theatre of theatres) {
    theatreIds[theatre.key] = await upsertTheatre(theatre);
  }

  for (const movie of movies) {
    const showId = await upsertMovie(movie, theatreIds[movie.theatreKey]);
    const showtimeIds = await ensureShowtimes(movie, showId);

    for (const showtimeId of showtimeIds) {
      await ensureSeats(showtimeId);
    }
  }

  console.log('Movie seed ready: The Super Mario Galaxy Movie, Oppenheimer, Michael.');
}

seedMovies().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
