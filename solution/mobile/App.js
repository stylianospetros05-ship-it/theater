import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { API_URL, apiRequest, clearSession, restoreStoredSession, saveSession } from './src/api';

const fallbackShowImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80';
const fallbackTheatreImage = 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80';

function formatDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatMoney(value) {
  return `EUR ${Number(value || 0).toFixed(2)}`;
}

function seatsLabel(seats = []) {
  return seats
    .map((entry) => {
      const seat = entry.seat || entry;
      return `${seat.row_label}${seat.seat_number}`;
    })
    .join(', ');
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, body }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
    </View>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setName('');
    setEmail('');
    setPassword('');
  }

  async function submit() {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      if (!cleanEmail || !password) {
        Alert.alert('Missing details', 'Please enter your email and password.');
        return;
      }

      if (mode === 'register' && cleanName.length < 2) {
        Alert.alert('Missing details', 'Please enter your full name.');
        return;
      }

      if (mode === 'register' && password.length < 6) {
        Alert.alert('Weak password', 'Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      const payload = mode === 'register'
        ? { name: cleanName, email: cleanEmail, password }
        : { email: cleanEmail, password };

      const result = await apiRequest(`/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!result.session?.access_token) {
        throw new Error('Login succeeded but no access token was returned.');
      }

      await saveSession(result.user, result.session);
      onAuth(result.user, result.session.access_token);
    } catch (error) {
      Alert.alert('Authentication failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground source={{ uri: fallbackTheatreImage }} style={styles.authBackground}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.authKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={styles.authScrollContent}
        >
          <View style={styles.authPanel}>
            <Text style={styles.brandKicker}>Mobile Theatre Reservations</Text>
            <Text style={styles.authTitle}>Book the best seats in the room.</Text>
            <Text style={styles.authSubtitle}>
              Create an account, browse shows, pick a showtime and reserve exact seats with a secure JWT session.
            </Text>

            <View style={styles.segment}>
              {['login', 'register'].map((item) => (
                <Pressable
                  key={item}
                  style={[styles.segmentButton, mode === item && styles.segmentButtonActive]}
                  onPress={() => switchMode(item)}
                >
                  <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>
                    {item === 'login' ? 'Login' : 'Register'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              textContentType={mode === 'login' ? 'password' : 'newPassword'}
            />

            <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Login' : 'Create account'}</Text>}
            </Pressable>
            <Text style={styles.helperText}>API: {API_URL}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function TheatreStrip({ theatres, selectedTheatreId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.theatreStrip}>
      <Pressable
        style={[styles.theatreChip, !selectedTheatreId && styles.theatreChipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.theatreChipText, !selectedTheatreId && styles.theatreChipTextActive]}>All</Text>
      </Pressable>
      {theatres.map((theatre) => (
        <Pressable
          key={theatre.id}
          style={[styles.theatreChip, selectedTheatreId === theatre.id && styles.theatreChipActive]}
          onPress={() => onSelect(theatre.id)}
        >
          <Text style={[styles.theatreChipText, selectedTheatreId === theatre.id && styles.theatreChipTextActive]}>
            {theatre.name}
          </Text>
          <Text style={[styles.theatreChipMeta, selectedTheatreId === theatre.id && styles.theatreChipTextActive]}>
            {theatre.location}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ShowCard({ show, selected, onPress }) {
  return (
    <Pressable style={[styles.showCard, selected && styles.showCardSelected]} onPress={onPress}>
      <Image source={{ uri: show.image_url || fallbackShowImage }} style={styles.showImage} />
      <View style={styles.showBody}>
        <View style={styles.showTopLine}>
          <Text style={styles.genrePill}>{show.genre || 'Show'}</Text>
          <Text style={styles.agePill}>{show.age_rating}</Text>
        </View>
        <Text style={styles.showTitle}>{show.title}</Text>
        <Text style={styles.showMeta}>{show.theatre?.name} - {show.theatre?.location}</Text>
        <Text style={styles.showDescription} numberOfLines={2}>{show.description}</Text>
        <View style={styles.showFooter}>
          <Text style={styles.showFooterText}>{show.duration_minutes} min</Text>
          <Text style={styles.showFooterText}>{show.language || 'Greek'}</Text>
          <Text style={styles.showFooterStrong}>{show.showtime_count || 0} times</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ShowtimeList({ showtimes, selectedShowtime, onSelect }) {
  if (!showtimes.length) {
    return <EmptyState title="No showtimes yet" body="Choose another show or run the Supabase seed data." />;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.showtimeStrip}>
      {showtimes.map((showtime) => (
        <Pressable
          key={showtime.id}
          style={[styles.showtimeCard, selectedShowtime?.id === showtime.id && styles.showtimeCardActive]}
          onPress={() => onSelect(showtime)}
        >
          <Text style={[styles.showtimeDate, selectedShowtime?.id === showtime.id && styles.showtimeTextActive]}>
            {formatDate(showtime.starts_at)}
          </Text>
          <Text style={[styles.showtimeHall, selectedShowtime?.id === showtime.id && styles.showtimeTextActive]}>
            {showtime.hall}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SeatMap({ seats, selectedSeats, onToggle }) {
  const rows = useMemo(() => {
    const grouped = {};
    seats.forEach((seat) => {
      grouped[seat.row_label] = grouped[seat.row_label] || [];
      grouped[seat.row_label].push(seat);
    });

    return Object.entries(grouped).map(([row, rowSeats], index) => [
      row,
      rowSeats.sort((a, b) => a.seat_number - b.seat_number),
      index
    ]);
  }, [seats]);

  if (!seats.length) {
    return <EmptyState title="Pick a showtime" body="Seat availability appears after choosing a date and hall." />;
  }

  return (
    <View style={styles.cinemaPanel}>
      <View style={styles.cinemaGlow}>
        <View style={styles.cinemaScreen}>
          <Text style={styles.cinemaScreenText}>SCREEN</Text>
        </View>
      </View>

      <View style={styles.auditorium}>
        {rows.map(([row, rowSeats, rowIndex]) => (
          <View key={row} style={styles.cinemaSeatRow}>
            <Text style={styles.cinemaRowLabel}>{row}</Text>
            <View
              style={[
                styles.cinemaRowSeats,
                rowIndex <= 1 && styles.cinemaRowBack,
                rowIndex >= rows.length - 2 && styles.cinemaRowFront
              ]}
            >
            {rowSeats.map((seat) => {
              const selected = selectedSeats.some((item) => item.id === seat.id);
              return (
                <Pressable
                  key={seat.id}
                  onPress={() => onToggle(seat)}
                  disabled={seat.is_reserved}
                  style={[
                    styles.cinemaSeat,
                    seat.category === 'VIP' && styles.cinemaSeatVip,
                    seat.category === 'Premium' && styles.cinemaSeatPremium,
                    seat.category === 'Standard' && styles.cinemaSeatStandard,
                    selected && styles.cinemaSeatSelected,
                    seat.is_reserved && styles.cinemaSeatReserved
                  ]}
                >
                  <Text style={[styles.cinemaSeatText, selected && styles.cinemaSeatTextSelected]}>
                    {seat.seat_number}
                  </Text>
                </Pressable>
              );
            })}
            </View>
            <Text style={styles.cinemaRowLabel}>{row}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cinemaLegend}>
        <View style={styles.legendBlock}>
          <View style={[styles.legendSwatch, styles.cinemaSeatVip]} />
          <Text style={styles.cinemaLegendText}>VIP</Text>
        </View>
        <View style={styles.legendBlock}>
          <View style={[styles.legendSwatch, styles.cinemaSeatPremium]} />
          <Text style={styles.cinemaLegendText}>Premium</Text>
        </View>
        <View style={styles.legendBlock}>
          <View style={[styles.legendSwatch, styles.cinemaSeatStandard]} />
          <Text style={styles.cinemaLegendText}>Standard</Text>
        </View>
        <View style={styles.legendBlock}>
          <View style={[styles.legendSwatch, styles.cinemaSeatSelected]} />
          <Text style={styles.cinemaLegendText}>Selected</Text>
        </View>
        <View style={styles.legendBlock}>
          <View style={[styles.legendSwatch, styles.cinemaSeatReserved]} />
          <Text style={styles.cinemaLegendText}>Reserved</Text>
        </View>
      </View>
    </View>
  );
}

function BrowseScreen({ token, selectedContext, setSelectedContext, editingReservation, setEditingReservation, refreshReservations }) {
  const [search, setSearch] = useState('');
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [seats, setSeats] = useState([]);
  const [selectedTheatreId, setSelectedTheatreId] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadTheatres() {
    const data = await apiRequest('/theatres');
    setTheatres(data);
  }

  async function loadShows(nextTheatreId = selectedTheatreId) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (nextTheatreId) params.set('theatreId', nextTheatreId);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest(`/shows${query}`);
      setShows(data);
    } catch (error) {
      Alert.alert('Could not load shows', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectTheatre(theatreId) {
    setSelectedTheatreId(theatreId);
    setSelectedShow(null);
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setShowtimes([]);
    setSeats([]);
    await loadShows(theatreId);
  }

  async function selectShow(show) {
    try {
      setSelectedShow(show);
      setSelectedShowtime(null);
      setSelectedSeats([]);
      setSeats([]);
      const data = await apiRequest(`/showtimes?showId=${show.id}`);
      setShowtimes(data);
    } catch (error) {
      Alert.alert('Could not load showtimes', error.message);
    }
  }

  async function selectShowtime(showtime) {
    try {
      setSelectedShowtime(showtime);
      setSelectedSeats([]);
      const data = await apiRequest(`/seats?showtimeId=${showtime.id}`);
      setSeats(data);
    } catch (error) {
      Alert.alert('Could not load seats', error.message);
    }
  }

  function toggleSeat(seat) {
    const alreadySelected = selectedSeats.some((item) => item.id === seat.id);
    const next = alreadySelected
      ? selectedSeats.filter((item) => item.id !== seat.id)
      : [...selectedSeats, seat];

    setSelectedSeats(next);
    setSelectedContext({ show: selectedShow, showtime: selectedShowtime, seats: next });
  }

  async function submitReservation() {
    if (!selectedShowtime || selectedSeats.length === 0) {
      Alert.alert('Choose seats', 'Select a showtime and at least one available seat.');
      return;
    }

    try {
      const body = JSON.stringify({
        showtimeId: selectedShowtime.id,
        seatIds: selectedSeats.map((seat) => seat.id)
      });

      if (editingReservation) {
        await apiRequest(`/reservations/${editingReservation.id}`, { method: 'PUT', body }, token);
        Alert.alert('Reservation updated', 'Your new seats are confirmed.');
        setEditingReservation(null);
      } else {
        await apiRequest('/reservations', { method: 'POST', body }, token);
        Alert.alert('Reservation confirmed', 'Your seats have been reserved.');
      }

      setSelectedSeats([]);
      setSelectedContext(null);
      await selectShowtime(selectedShowtime);
      refreshReservations();
    } catch (error) {
      Alert.alert('Reservation failed', error.message);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        setLoading(true);
        await loadTheatres();
        await loadShows(null);
      } catch (error) {
        Alert.alert('Could not load catalogue', error.message);
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, []);

  const selectedTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0),
    [selectedSeats]
  );

  const heroShow = selectedShow || shows[0];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadShows()} />}
    >
      <ImageBackground source={{ uri: heroShow?.image_url || fallbackShowImage }} style={styles.hero}>
        <View style={styles.heroShade}>
          <Text style={styles.heroKicker}>Now booking</Text>
          <Text style={styles.heroTitle}>{heroShow?.title || 'Theatre Reservations'}</Text>
          <Text style={styles.heroSubtitle}>{heroShow?.theatre?.name || 'Browse shows and pick exact seats.'}</Text>
        </View>
      </ImageBackground>

      <View style={styles.dashboardRow}>
        <StatPill label="Theatres" value={theatres.length} />
        <StatPill label="Shows" value={shows.length} />
        <StatPill label="Selected" value={selectedSeats.length} />
      </View>

      {editingReservation && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerTitle}>Modifying reservation</Text>
          <Text style={styles.editBannerText}>Pick a new showtime and seats, then confirm the update.</Text>
          <Pressable onPress={() => setEditingReservation(null)}>
            <Text style={styles.editBannerAction}>Cancel edit</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder="Search theatre, location or show"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => loadShows()}
        />
        <Pressable style={styles.smallButton} onPress={() => loadShows()}>
          <Text style={styles.smallButtonText}>Search</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Theatres</Text>
      <TheatreStrip theatres={theatres} selectedTheatreId={selectedTheatreId} onSelect={selectTheatre} />

      <Text style={styles.sectionTitle}>Shows and movies</Text>
      {shows.length === 0 && !loading ? (
        <EmptyState title="No results" body="Try another search or check that the Supabase schema has been seeded." />
      ) : (
        shows.map((show) => (
          <ShowCard
            key={show.id}
            show={show}
            selected={selectedShow?.id === show.id}
            onPress={() => selectShow(show)}
          />
        ))
      )}

      {selectedShow && (
        <>
          <Text style={styles.sectionTitle}>Showtimes</Text>
          <ShowtimeList showtimes={showtimes} selectedShowtime={selectedShowtime} onSelect={selectShowtime} />
        </>
      )}

      <Text style={styles.sectionTitle}>Choose seats</Text>
      <SeatMap seats={seats} selectedSeats={selectedSeats} onToggle={toggleSeat} />

      <View style={styles.bookingSummary}>
        <View>
          <Text style={styles.summaryLabel}>Booking summary</Text>
          <Text style={styles.summaryTitle}>{selectedShow?.title || 'No show selected'}</Text>
          <Text style={styles.summaryText}>{selectedShowtime ? formatDate(selectedShowtime.starts_at) : 'Choose date and hall'}</Text>
          <Text style={styles.summaryText}>Seats: {selectedSeats.length ? seatsLabel(selectedSeats) : 'None'}</Text>
        </View>
        <View style={styles.summaryPriceBox}>
          <Text style={styles.summaryPrice}>{formatMoney(selectedTotal)}</Text>
          <Text style={styles.summaryPriceLabel}>{selectedSeats.length} tickets</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={submitReservation}>
        <Text style={styles.primaryButtonText}>{editingReservation ? 'Update reservation' : 'Reserve seats'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ReservationCard({ item, onCancel, onModify }) {
  const canChange = item.status === 'confirmed' && new Date(item.showtime?.starts_at) > new Date();
  const seats = seatsLabel(item.reservation_seats || []);

  return (
    <View style={styles.reservationCard}>
      <Image source={{ uri: item.showtime?.show?.image_url || fallbackShowImage }} style={styles.reservationImage} />
      <View style={styles.reservationBody}>
        <View style={styles.reservationTop}>
          <Text style={styles.statusPill}>{item.status}</Text>
          <Text style={styles.reservationPrice}>{formatMoney(item.total_price)}</Text>
        </View>
        <Text style={styles.reservationTitle}>{item.showtime?.show?.title}</Text>
        <Text style={styles.reservationMeta}>{item.showtime?.show?.theatre?.name} - {item.showtime?.hall}</Text>
        <Text style={styles.reservationMeta}>{formatDate(item.showtime?.starts_at)}</Text>
        <Text style={styles.reservationSeats}>Seats: {seats}</Text>

        {canChange && (
          <View style={styles.actionRow}>
            <Pressable style={styles.outlineButton} onPress={() => onModify(item)}>
              <Text style={styles.outlineButtonText}>Modify</Text>
            </Pressable>
            <Pressable style={styles.dangerButton} onPress={() => onCancel(item.id)}>
              <Text style={styles.dangerButtonText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function ReservationsScreen({ reservations, loadReservations, onCancel, onModify }) {
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={reservations}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadReservations} />}
      ListHeaderComponent={(
        <>
          <Text style={styles.sectionTitle}>My reservations</Text>
          <Text style={styles.profileHint}>Future reservations can be modified or cancelled from here.</Text>
        </>
      )}
      ListEmptyComponent={<EmptyState title="No reservations yet" body="Reserve seats from the Browse tab and they will appear here." />}
      renderItem={({ item }) => <ReservationCard item={item} onCancel={onCancel} onModify={onModify} />}
    />
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('browse');
  const [reservations, setReservations] = useState([]);
  const [selectedContext, setSelectedContext] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);

  async function loadReservations(currentToken = token) {
    if (!currentToken) return;
    try {
      const data = await apiRequest('/user/reservations', {}, currentToken);
      setReservations(data);
    } catch (error) {
      Alert.alert('Could not load reservations', error.message);
    }
  }

  async function cancelReservation(id) {
    try {
      await apiRequest(`/reservations/${id}`, { method: 'DELETE' }, token);
      Alert.alert('Reservation cancelled');
      loadReservations();
    } catch (error) {
      Alert.alert('Could not cancel reservation', error.message);
    }
  }

  function startModifyReservation(reservation) {
    setEditingReservation(reservation);
    setSelectedContext(null);
    setTab('browse');
    Alert.alert('Modify reservation', 'Choose the new showtime and seats in Browse.');
  }

  async function logout() {
    await clearSession();
    setToken(null);
    setUser(null);
    setReservations([]);
    setEditingReservation(null);
    setSelectedContext(null);
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = await restoreStoredSession();
        if (stored.token && stored.user) {
          setToken(stored.token);
          setUser(stored.user);
          loadReservations(stored.token);
        }
      } finally {
        setBooting(false);
      }
    }

    restoreSession();
  }, []);

  if (booting) {
    return (
      <SafeAreaView style={styles.safeCenter}>
        <ActivityIndicator color="#0f766e" />
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <AuthScreen
        onAuth={(nextUser, nextToken) => {
          setUser(nextUser);
          setToken(nextToken);
          loadReservations(nextToken);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Theatre SeatBook</Text>
          <Text style={styles.headerMeta}>{user?.name || user?.email}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'browse' && styles.tabActive]} onPress={() => setTab('browse')}>
          <Text style={[styles.tabText, tab === 'browse' && styles.tabTextActive]}>Browse</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'reservations' && styles.tabActive]}
          onPress={() => {
            setTab('reservations');
            loadReservations();
          }}
        >
          <Text style={[styles.tabText, tab === 'reservations' && styles.tabTextActive]}>
            Reservations ({reservations.length})
          </Text>
        </Pressable>
      </View>

      {tab === 'browse' ? (
        <BrowseScreen
          token={token}
          selectedContext={selectedContext}
          setSelectedContext={setSelectedContext}
          editingReservation={editingReservation}
          setEditingReservation={setEditingReservation}
          refreshReservations={loadReservations}
        />
      ) : (
        <ReservationsScreen
          reservations={reservations}
          loadReservations={loadReservations}
          onCancel={cancelReservation}
          onModify={startModifyReservation}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f3ef'
  },
  safeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ef'
  },
  authBackground: {
    flex: 1
  },
  authKeyboard: {
    flex: 1
  },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: 48,
    backgroundColor: 'rgba(10, 16, 24, 0.5)'
  },
  authOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 16, 24, 0.5)'
  },
  authPanel: {
    padding: 22,
    paddingTop: 28,
    gap: 12,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28
  },
  brandKicker: {
    color: '#9f1239',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0
  },
  authTitle: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38
  },
  authSubtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827'
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e7e5e4',
    borderRadius: 8,
    padding: 4
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  segmentButtonActive: {
    backgroundColor: '#fff'
  },
  segmentText: {
    color: '#57534e',
    fontWeight: '800'
  },
  segmentTextActive: {
    color: '#9f1239'
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9f1239',
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 14
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900'
  },
  helperText: {
    color: '#78716c',
    fontSize: 12,
    lineHeight: 17
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4'
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827'
  },
  headerMeta: {
    color: '#78716c',
    marginTop: 2
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  logoutText: {
    color: '#44403c',
    fontWeight: '800'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f4'
  },
  tabActive: {
    backgroundColor: '#111827'
  },
  tabText: {
    color: '#57534e',
    fontWeight: '900'
  },
  tabTextActive: {
    color: '#fff'
  },
  screen: {
    flex: 1
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28
  },
  hero: {
    minHeight: 210,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#111827'
  },
  heroShade: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.35)'
  },
  heroKicker: {
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: 4
  },
  heroSubtitle: {
    color: '#f5f5f4',
    fontSize: 15,
    marginTop: 4
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 8
  },
  statPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4'
  },
  statValue: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900'
  },
  statLabel: {
    color: '#78716c',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700'
  },
  editBanner: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4
  },
  editBannerTitle: {
    color: '#9f1239',
    fontWeight: '900'
  },
  editBannerText: {
    color: '#7f1d1d',
    lineHeight: 20
  },
  editBannerAction: {
    color: '#9f1239',
    fontWeight: '900',
    marginTop: 4
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  searchInput: {
    flex: 1
  },
  smallButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: '#111827'
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '900'
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4
  },
  theatreStrip: {
    gap: 8,
    paddingRight: 8
  },
  theatreChip: {
    minWidth: 120,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e5e4'
  },
  theatreChipActive: {
    backgroundColor: '#9f1239',
    borderColor: '#9f1239'
  },
  theatreChipText: {
    color: '#292524',
    fontWeight: '900'
  },
  theatreChipTextActive: {
    color: '#fff'
  },
  theatreChipMeta: {
    color: '#78716c',
    fontSize: 12,
    marginTop: 3
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 8,
    overflow: 'hidden'
  },
  showCardSelected: {
    borderColor: '#9f1239',
    backgroundColor: '#fff7ed'
  },
  showImage: {
    width: 104,
    minHeight: 158,
    backgroundColor: '#d6d3d1'
  },
  showBody: {
    flex: 1,
    padding: 12,
    gap: 5
  },
  showTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  genrePill: {
    color: '#9f1239',
    fontWeight: '900',
    fontSize: 12
  },
  agePill: {
    color: '#44403c',
    fontWeight: '900',
    fontSize: 12
  },
  showTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  showMeta: {
    color: '#57534e',
    fontWeight: '700'
  },
  showDescription: {
    color: '#78716c',
    lineHeight: 19
  },
  showFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3
  },
  showFooterText: {
    color: '#57534e',
    fontSize: 12,
    fontWeight: '700'
  },
  showFooterStrong: {
    color: '#9f1239',
    fontSize: 12,
    fontWeight: '900'
  },
  showtimeStrip: {
    gap: 8,
    paddingRight: 8
  },
  showtimeCard: {
    width: 148,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e5e4'
  },
  showtimeCardActive: {
    backgroundColor: '#111827',
    borderColor: '#111827'
  },
  showtimeDate: {
    color: '#111827',
    fontWeight: '900',
    lineHeight: 19
  },
  showtimeHall: {
    color: '#78716c',
    marginTop: 5,
    fontWeight: '700'
  },
  showtimeTextActive: {
    color: '#fff'
  },
  cinemaPanel: {
    backgroundColor: '#0d0f0f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    gap: 14,
    overflow: 'hidden'
  },
  cinemaGlow: {
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 18,
    backgroundColor: '#101817'
  },
  cinemaScreen: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#22302f',
    borderBottomWidth: 2,
    borderBottomColor: '#334b49'
  },
  cinemaScreenText: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0
  },
  auditorium: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    gap: 5,
    backgroundColor: '#111313',
    borderRadius: 8
  },
  cinemaSeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  cinemaRowLabel: {
    width: 15,
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center'
  },
  cinemaRowSeats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 1
  },
  cinemaRowBack: {
    paddingHorizontal: 10
  },
  cinemaRowFront: {
    paddingHorizontal: 22
  },
  cinemaSeat: {
    width: 24,
    height: 24,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  cinemaSeatVip: {
    backgroundColor: '#c4b5fd',
    borderColor: '#7c3aed'
  },
  cinemaSeatPremium: {
    backgroundColor: '#fde68a',
    borderColor: '#b45309'
  },
  cinemaSeatStandard: {
    backgroundColor: '#ffffff',
    borderColor: '#9ca3af'
  },
  cinemaSeatSelected: {
    backgroundColor: '#4ade80',
    borderColor: '#15803d'
  },
  cinemaSeatReserved: {
    backgroundColor: '#5b6060',
    borderColor: '#3f4444'
  },
  cinemaSeatText: {
    color: '#111827',
    fontSize: 9,
    fontWeight: '900'
  },
  cinemaSeatTextSelected: {
    color: '#052e16'
  },
  cinemaLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 2
  },
  legendBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  legendSwatch: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 2
  },
  cinemaLegendText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800'
  },
  bookingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14
  },
  summaryLabel: {
    color: '#9f1239',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  summaryTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3
  },
  summaryText: {
    color: '#78716c',
    marginTop: 3
  },
  summaryPriceBox: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  summaryPrice: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  summaryPriceLabel: {
    color: '#78716c',
    fontSize: 12,
    marginTop: 2
  },
  reservationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    overflow: 'hidden'
  },
  reservationImage: {
    width: 92,
    backgroundColor: '#d6d3d1'
  },
  reservationBody: {
    flex: 1,
    padding: 12,
    gap: 5
  },
  reservationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  statusPill: {
    color: '#9f1239',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  reservationPrice: {
    color: '#111827',
    fontWeight: '900'
  },
  reservationTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900'
  },
  reservationMeta: {
    color: '#78716c',
    lineHeight: 19
  },
  reservationSeats: {
    color: '#44403c',
    fontWeight: '800'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  outlineButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9f1239',
    borderRadius: 8,
    paddingVertical: 10
  },
  outlineButtonText: {
    color: '#9f1239',
    fontWeight: '900'
  },
  dangerButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 10
  },
  dangerButtonText: {
    color: '#991b1b',
    fontWeight: '900'
  },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 16,
    gap: 4
  },
  emptyTitle: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 16
  },
  emptyText: {
    color: '#78716c',
    lineHeight: 20
  },
  profileHint: {
    color: '#78716c',
    lineHeight: 20,
    marginBottom: 2
  }
});
