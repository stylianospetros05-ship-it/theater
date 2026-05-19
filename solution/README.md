# Theatre Reservations

React Native + Expo Go mobile app and a Node.js/Express REST API backed by Supabase.

## GitHub Repository

The complete project is available on GitHub:

[https://github.com/stylianospetros05-ship-it/theater](https://github.com/stylianospetros05-ship-it/theater)

## What It Includes

- Email/password registration and login through Supabase Auth.
- JWT-protected REST API.
- Polished React Native mobile UI for browsing theatres, shows, movie-night events, and exact hall seats.
- Search by theatre, location, title, or show/movie category.
- Showtime details with hall, duration, age rating, language, seat category, and price.
- Visual seat map with VIP, premium, standard, selected, and reserved seats.
- Reservation creation, update, cancellation, and user history.
- Supabase SQL schema with richer sample theatre, show, showtime, poster image, and seat data.

## Project Structure

```text
solution/
  api/       Express REST API
  mobile/    Expo Go React Native app
  supabase/  SQL schema and seed data
```

## 1. Create The Supabase Tables

Open your Supabase project SQL editor and run:

```text
supabase/schema.sql
```

This creates the tables, indexes, row-level security policies, reservation RPC functions, and sample data.

If you already ran an older version of the schema, run the latest file again. It adds show images, genres,
languages, richer sample listings, and a larger seat map.

## 2. Configure The API

```bash
cd api
copy .env.example .env
npm install
npm run dev
```

The API expects these environment variables:

```env
PORT=4000
SUPABASE_URL=https://obhppgdqlgqqfptmasew.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in the backend `.env`. Do not place it in the mobile app.

Users can create their own account through the app registration screen and then log in with their own email and password.

To add the real movie listings used by the demo app, run this after the SQL schema exists:

```bash
cd api
npm run seed:movies
```

This adds:

- The Super Mario Galaxy Movie
- Oppenheimer
- Michael

Each movie gets poster artwork, description, duration, age rating, language, multiple showtimes, and a 60-seat hall map.

## 3. Configure The Expo App

```bash
cd mobile
copy .env.example .env
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` to the URL your phone can reach:

- Android emulator: `http://10.0.2.2:4000`
- iOS simulator: `http://localhost:4000`
- Physical phone with Expo Go: `http://YOUR_COMPUTER_LAN_IP:4000`

For the submitted version, `mobile/.env` is currently set to the developer computer IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.68.63:4000
```

If you open the project on another computer, replace `192.168.68.63` with that computer's local Wi-Fi/LAN IPv4 address. On Windows, you can find it with:

```bash
ipconfig
```

Then restart Expo with:

```bash
npm start -- --clear
```

## Main API Routes

```text
POST   /register
POST   /login
GET    /theatres
GET    /shows?theatreId=&title=&date=&location=
GET    /showtimes?showId=
GET    /seats?showtimeId=
POST   /reservations
PUT    /reservations/:id
DELETE /reservations/:id
GET    /user/reservations
```

Protected routes require:

```text
Authorization: Bearer <supabase-access-token>
```

## Notes For The Assignment

The original brief mentions MariaDB, but this implementation uses Supabase PostgreSQL because Supabase keys were provided. The architecture still matches the required distributed system shape: mobile client -> REST API -> database/auth provider.

Assignment coverage:

- Frontend: React Native + Expo, secure token storage, registration/login, search, show details, seat booking, profile/history.
- Backend: Express routes split into controllers, route files and auth middleware.
- Authentication: Supabase JWT access tokens passed as `Authorization: Bearer <token>`.
- Database: relational tables with primary/foreign keys, row-level security policies, and RPC functions for safe seat reservation updates.
