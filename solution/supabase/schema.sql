create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.theatres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  theatre_id uuid not null references public.theatres(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  age_rating text not null default 'All',
  genre text not null default 'Drama',
  language text not null default 'Greek',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.showtimes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  hall text not null,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  showtime_id uuid not null references public.showtimes(id) on delete cascade,
  row_label text not null,
  seat_number int not null,
  category text not null default 'Standard',
  price numeric(10, 2) not null check (price >= 0),
  unique (showtime_id, row_label, seat_number)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  showtime_id uuid not null references public.showtimes(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  total_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_seats (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete restrict,
  primary key (reservation_id, seat_id)
);

create index if not exists idx_shows_theatre_id on public.shows(theatre_id);
create index if not exists idx_showtimes_show_id on public.showtimes(show_id);
create index if not exists idx_showtimes_starts_at on public.showtimes(starts_at);
create index if not exists idx_seats_showtime_id on public.seats(showtime_id);
create index if not exists idx_reservations_user_id on public.reservations(user_id);
create index if not exists idx_reservations_showtime_id on public.reservations(showtime_id);

alter table public.theatres add column if not exists image_url text;
alter table public.shows add column if not exists genre text not null default 'Drama';
alter table public.shows add column if not exists language text not null default 'Greek';
alter table public.shows add column if not exists image_url text;

alter table public.profiles enable row level security;
alter table public.theatres enable row level security;
alter table public.shows enable row level security;
alter table public.showtimes enable row level security;
alter table public.seats enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_seats enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Public can read theatres" on public.theatres;
create policy "Public can read theatres"
on public.theatres for select
to anon, authenticated
using (true);

drop policy if exists "Public can read shows" on public.shows;
create policy "Public can read shows"
on public.shows for select
to anon, authenticated
using (true);

drop policy if exists "Public can read showtimes" on public.showtimes;
create policy "Public can read showtimes"
on public.showtimes for select
to anon, authenticated
using (true);

drop policy if exists "Public can read seats" on public.seats;
create policy "Public can read seats"
on public.seats for select
to anon, authenticated
using (true);

drop policy if exists "Users can read own reservations" on public.reservations;
create policy "Users can read own reservations"
on public.reservations for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own reserved seats" on public.reservation_seats;
create policy "Users can read own reserved seats"
on public.reservation_seats for select
using (
  exists (
    select 1
    from public.reservations r
    where r.id = reservation_id
      and r.user_id = auth.uid()
  )
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reservations_touch_updated_at on public.reservations;
create trigger reservations_touch_updated_at
before update on public.reservations
for each row execute function public.touch_updated_at();

create or replace function public.get_seat_availability(p_showtime_id uuid)
returns table (
  id uuid,
  showtime_id uuid,
  row_label text,
  seat_number int,
  category text,
  price numeric,
  is_reserved boolean
)
language sql
stable
as $$
  select
    s.id,
    s.showtime_id,
    s.row_label,
    s.seat_number,
    s.category,
    s.price,
    exists (
      select 1
      from public.reservation_seats rs
      join public.reservations r on r.id = rs.reservation_id
      where rs.seat_id = s.id
        and r.showtime_id = p_showtime_id
        and r.status = 'confirmed'
    ) as is_reserved
  from public.seats s
  where s.showtime_id = p_showtime_id
  order by s.row_label, s.seat_number;
$$;

create or replace function public.create_reservation(
  p_user_id uuid,
  p_showtime_id uuid,
  p_seat_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
  v_requested_count int;
  v_locked_count int;
  v_total numeric(10, 2);
begin
  v_requested_count := coalesce(array_length(p_seat_ids, 1), 0);
  if v_requested_count = 0 then
    raise exception 'At least one seat is required';
  end if;

  perform 1 from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User profile not found';
  end if;

  perform 1 from public.showtimes where id = p_showtime_id and starts_at > now();
  if not found then
    raise exception 'Showtime is not available for reservations';
  end if;

  with locked as (
    select *
    from public.seats
    where id = any(p_seat_ids)
      and showtime_id = p_showtime_id
    order by row_label, seat_number
    for update
  )
  select count(*), coalesce(sum(price), 0)
  into v_locked_count, v_total
  from locked;

  if v_locked_count <> v_requested_count then
    raise exception 'One or more selected seats are invalid for this showtime';
  end if;

  if exists (
    select 1
    from public.reservation_seats rs
    join public.reservations r on r.id = rs.reservation_id
    where rs.seat_id = any(p_seat_ids)
      and r.showtime_id = p_showtime_id
      and r.status = 'confirmed'
  ) then
    raise exception 'One or more selected seats are already reserved';
  end if;

  insert into public.reservations (user_id, showtime_id, total_price)
  values (p_user_id, p_showtime_id, v_total)
  returning id into v_reservation_id;

  insert into public.reservation_seats (reservation_id, seat_id)
  select v_reservation_id, unnest(p_seat_ids);

  return jsonb_build_object(
    'id', v_reservation_id,
    'showtimeId', p_showtime_id,
    'seatIds', p_seat_ids,
    'totalPrice', v_total,
    'status', 'confirmed'
  );
end;
$$;

create or replace function public.update_reservation(
  p_reservation_id uuid,
  p_user_id uuid,
  p_showtime_id uuid,
  p_seat_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_showtime_id uuid;
  v_requested_count int;
  v_locked_count int;
  v_total numeric(10, 2);
begin
  select coalesce(p_showtime_id, r.showtime_id)
  into v_showtime_id
  from public.reservations r
  join public.showtimes st on st.id = r.showtime_id
  where r.id = p_reservation_id
    and r.user_id = p_user_id
    and r.status = 'confirmed'
    and st.starts_at > now()
  for update of r;

  if v_showtime_id is null then
    raise exception 'Reservation cannot be modified';
  end if;

  v_requested_count := coalesce(array_length(p_seat_ids, 1), 0);
  if v_requested_count = 0 then
    raise exception 'At least one seat is required';
  end if;

  with locked as (
    select *
    from public.seats
    where id = any(p_seat_ids)
      and showtime_id = v_showtime_id
    order by row_label, seat_number
    for update
  )
  select count(*), coalesce(sum(price), 0)
  into v_locked_count, v_total
  from locked;

  if v_locked_count <> v_requested_count then
    raise exception 'One or more selected seats are invalid for this showtime';
  end if;

  if exists (
    select 1
    from public.reservation_seats rs
    join public.reservations r on r.id = rs.reservation_id
    where rs.seat_id = any(p_seat_ids)
      and r.showtime_id = v_showtime_id
      and r.status = 'confirmed'
      and r.id <> p_reservation_id
  ) then
    raise exception 'One or more selected seats are already reserved';
  end if;

  update public.reservations
  set showtime_id = v_showtime_id,
      total_price = v_total
  where id = p_reservation_id;

  delete from public.reservation_seats where reservation_id = p_reservation_id;

  insert into public.reservation_seats (reservation_id, seat_id)
  select p_reservation_id, unnest(p_seat_ids);

  return jsonb_build_object(
    'id', p_reservation_id,
    'showtimeId', v_showtime_id,
    'seatIds', p_seat_ids,
    'totalPrice', v_total,
    'status', 'confirmed'
  );
end;
$$;

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  update public.reservations r
  set status = 'cancelled'
  from public.showtimes st
  where r.id = p_reservation_id
    and r.user_id = p_user_id
    and r.status = 'confirmed'
    and st.id = r.showtime_id
    and st.starts_at > now()
  returning r.id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Reservation cannot be cancelled';
  end if;

  return jsonb_build_object('id', v_updated_id, 'status', 'cancelled');
end;
$$;

grant execute on function public.get_seat_availability(uuid) to anon, authenticated, service_role;
grant execute on function public.create_reservation(uuid, uuid, uuid[]) to authenticated, service_role;
grant execute on function public.update_reservation(uuid, uuid, uuid, uuid[]) to authenticated, service_role;
grant execute on function public.cancel_reservation(uuid, uuid) to authenticated, service_role;

do $$
declare
  v_theatre_1 uuid;
  v_theatre_2 uuid;
  v_show_1 uuid;
  v_show_2 uuid;
  v_show_3 uuid;
  v_show_4 uuid;
  v_show_5 uuid;
  v_show_6 uuid;
  v_showtime uuid;
  v_row text;
  v_num int;
begin
  if exists (select 1 from public.theatres) then
    return;
  end if;

  insert into public.theatres (name, location, description, image_url)
  values (
    'Apollo Theatre',
    'Athens Center',
    'A historic city theatre with modern seating, premium balcony and Dolby surround hall.',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80'
  )
  returning id into v_theatre_1;

  insert into public.theatres (name, location, description, image_url)
  values (
    'Riverside Stage',
    'Piraeus',
    'A boutique venue for modern theatre, indie films and intimate evening screenings.',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=1200&q=80'
  )
  returning id into v_theatre_2;

  insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
  values (
    v_theatre_1,
    'Antigone',
    'A cinematic modern staging of the classic Greek tragedy with live music and dramatic lighting.',
    95,
    '12+',
    'Drama',
    'Greek',
    'https://images.unsplash.com/photo-1507924538820-ede94a04019d?auto=format&fit=crop&w=1000&q=80'
  )
  returning id into v_show_1;

  insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
  values (
    v_theatre_1,
    'The Comedy of Errors',
    'A bright, fast-paced comedy of mistaken identities, music and stage chaos.',
    110,
    'All',
    'Comedy',
    'English',
    'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1000&q=80'
  )
  returning id into v_show_2;

  insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
  values (
    v_theatre_2,
    'Night Train',
    'A contemporary mystery thriller set during one long night between Athens and the sea.',
    85,
    '15+',
    'Mystery',
    'Greek',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1000&q=80'
  )
  returning id into v_show_3;

  insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
  values (
    v_theatre_1,
    'Cinema Paradiso Live',
    'A warm movie-night tribute with orchestral themes, projected scenes and reserved cinema seating.',
    124,
    'All',
    'Movie Night',
    'Italian / Greek subtitles',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80'
  )
  returning id into v_show_4;

  insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
  values (
    v_theatre_2,
    'The Last Premiere',
    'A stylish backstage film-drama about an actress, a missing reel and a sold-out premiere.',
    102,
    '12+',
    'Film Drama',
    'English / Greek subtitles',
    'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1000&q=80'
  )
  returning id into v_show_5;

  insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
  values (
    v_theatre_2,
    'Orbit 9',
    'A sci-fi screening experience with immersive sound, neon stage design and late-night showtimes.',
    118,
    '12+',
    'Sci-Fi',
    'English',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1000&q=80'
  )
  returning id into v_show_6;

  for v_showtime in
    insert into public.showtimes (show_id, hall, starts_at)
    values
      (v_show_1, 'Main Hall', now() + interval '3 days'),
      (v_show_1, 'Main Hall', now() + interval '5 days'),
      (v_show_2, 'Main Hall', now() + interval '4 days'),
      (v_show_2, 'Balcony Screen', now() + interval '8 days'),
      (v_show_3, 'Black Box', now() + interval '6 days'),
      (v_show_4, 'Cinema Hall A', now() + interval '2 days'),
      (v_show_4, 'Cinema Hall A', now() + interval '7 days'),
      (v_show_5, 'Riverside Cinema', now() + interval '9 days'),
      (v_show_6, 'Black Box', now() + interval '10 days')
    returning id
  loop
    foreach v_row in array array['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] loop
      for v_num in 1..12 loop
        insert into public.seats (showtime_id, row_label, seat_number, category, price)
        values (
          v_showtime,
          v_row,
          v_num,
          case
            when v_row = 'A' then 'VIP'
            when v_row in ('B', 'C') then 'Premium'
            else 'Standard'
          end,
          case
            when v_row = 'A' then 28.00
            when v_row in ('B', 'C') then 22.00
            else 15.00
          end
        );
      end loop;
    end loop;
  end loop;
end $$;

-- Real movie listings for the cinema reservation demo.
-- Safe to re-run: existing theatres/shows are updated, missing showtimes/seats are inserted.
do $$
declare
  v_cinema uuid;
  v_premium uuid;
  v_mario uuid;
  v_oppenheimer uuid;
  v_michael uuid;
  v_showtime uuid;
  v_row text;
  v_num int;
begin
  select id into v_cinema
  from public.theatres
  where name = 'Galaxy Cinema'
  limit 1;

  if v_cinema is null then
    insert into public.theatres (name, location, description, image_url)
    values (
      'Galaxy Cinema',
      'Athens Mall',
      'Modern multiplex cinema with family screenings, premium sound and reserved numbered seats.',
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'
    )
    returning id into v_cinema;
  else
    update public.theatres
    set location = 'Athens Mall',
        description = 'Modern multiplex cinema with family screenings, premium sound and reserved numbered seats.',
        image_url = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'
    where id = v_cinema;
  end if;

  select id into v_premium
  from public.theatres
  where name = 'Premiere Hall'
  limit 1;

  if v_premium is null then
    insert into public.theatres (name, location, description, image_url)
    values (
      'Premiere Hall',
      'Syntagma',
      'Premium central cinema for major releases, biopics and late-night screenings.',
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80'
    )
    returning id into v_premium;
  else
    update public.theatres
    set location = 'Syntagma',
        description = 'Premium central cinema for major releases, biopics and late-night screenings.',
        image_url = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80'
    where id = v_premium;
  end if;

  select id into v_mario
  from public.shows
  where title = 'The Super Mario Galaxy Movie'
  limit 1;

  if v_mario is null then
    insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
    values (
      v_cinema,
      'The Super Mario Galaxy Movie',
      'Mario and Luigi blast off on a colorful galaxy adventure with Princess Peach, Bowser and new cosmic worlds.',
      98,
      'PG',
      'Animation / Adventure / Comedy',
      'English / Greek subtitles',
      'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/The_Super_Mario_Galaxy_Movie_poster.jpeg/250px-The_Super_Mario_Galaxy_Movie_poster.jpeg'
    )
    returning id into v_mario;
  else
    update public.shows
    set theatre_id = v_cinema,
        description = 'Mario and Luigi blast off on a colorful galaxy adventure with Princess Peach, Bowser and new cosmic worlds.',
        duration_minutes = 98,
        age_rating = 'PG',
        genre = 'Animation / Adventure / Comedy',
        language = 'English / Greek subtitles',
        image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/The_Super_Mario_Galaxy_Movie_poster.jpeg/250px-The_Super_Mario_Galaxy_Movie_poster.jpeg'
    where id = v_mario;
  end if;

  select id into v_oppenheimer
  from public.shows
  where title = 'Oppenheimer'
  limit 1;

  if v_oppenheimer is null then
    insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
    values (
      v_premium,
      'Oppenheimer',
      'Christopher Nolan''s biographical thriller about J. Robert Oppenheimer and the creation of the atomic bomb.',
      181,
      'R',
      'Biographical Thriller / Drama',
      'English / Greek subtitles',
      'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/250px-Oppenheimer_%28film%29.jpg'
    )
    returning id into v_oppenheimer;
  else
    update public.shows
    set theatre_id = v_premium,
        description = 'Christopher Nolan''s biographical thriller about J. Robert Oppenheimer and the creation of the atomic bomb.',
        duration_minutes = 181,
        age_rating = 'R',
        genre = 'Biographical Thriller / Drama',
        language = 'English / Greek subtitles',
        image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/250px-Oppenheimer_%28film%29.jpg'
    where id = v_oppenheimer;
  end if;

  select id into v_michael
  from public.shows
  where title = 'Michael'
  limit 1;

  if v_michael is null then
    insert into public.shows (theatre_id, title, description, duration_minutes, age_rating, genre, language, image_url)
    values (
      v_premium,
      'Michael',
      'A Michael Jackson biopic starring Jaafar Jackson, following the life and legacy of the King of Pop.',
      127,
      'PG-13',
      'Music Biopic / Drama',
      'English / Greek subtitles',
      'https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Michael_%282026_film_poster%29.png/250px-Michael_%282026_film_poster%29.png'
    )
    returning id into v_michael;
  else
    update public.shows
    set theatre_id = v_premium,
        description = 'A Michael Jackson biopic starring Jaafar Jackson, following the life and legacy of the King of Pop.',
        duration_minutes = 127,
        age_rating = 'PG-13',
        genre = 'Music Biopic / Drama',
        language = 'English / Greek subtitles',
        image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Michael_%282026_film_poster%29.png/250px-Michael_%282026_film_poster%29.png'
    where id = v_michael;
  end if;

  if not exists (select 1 from public.showtimes where show_id = v_mario and starts_at > now()) then
    insert into public.showtimes (show_id, hall, starts_at)
    values
      (v_mario, 'Galaxy Screen 1', now() + interval '2 days 18 hours'),
      (v_mario, 'Galaxy Screen 1', now() + interval '4 days 20 hours'),
      (v_mario, 'Family Screen', now() + interval '6 days 17 hours');
  end if;

  if not exists (select 1 from public.showtimes where show_id = v_oppenheimer and starts_at > now()) then
    insert into public.showtimes (show_id, hall, starts_at)
    values
      (v_oppenheimer, 'Premiere IMAX', now() + interval '3 days 21 hours'),
      (v_oppenheimer, 'Premiere IMAX', now() + interval '7 days 20 hours');
  end if;

  if not exists (select 1 from public.showtimes where show_id = v_michael and starts_at > now()) then
    insert into public.showtimes (show_id, hall, starts_at)
    values
      (v_michael, 'Premiere Hall A', now() + interval '5 days 19 hours'),
      (v_michael, 'Premiere Hall A', now() + interval '8 days 21 hours');
  end if;

  for v_showtime in
    select st.id
    from public.showtimes st
    where st.show_id in (v_mario, v_oppenheimer, v_michael)
      and not exists (
        select 1
        from public.seats s
        where s.showtime_id = st.id
      )
  loop
    foreach v_row in array array['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] loop
      for v_num in 1..12 loop
        insert into public.seats (showtime_id, row_label, seat_number, category, price)
        values (
          v_showtime,
          v_row,
          v_num,
          case
            when v_row = 'A' then 'VIP'
            when v_row in ('B', 'C') then 'Premium'
            else 'Standard'
          end,
          case
            when v_row = 'A' then 14.00
            when v_row in ('B', 'C') then 11.00
            else 8.00
          end
        );
      end loop;
    end loop;
  end loop;
end $$;
