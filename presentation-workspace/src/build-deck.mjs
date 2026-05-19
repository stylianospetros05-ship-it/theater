import {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  layers,
  panel,
  text,
  shape,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
  fr,
  auto,
} from "@oai/artifact-tool";

const W = 1920;
const H = 1080;

const C = {
  ink: "#161616",
  muted: "#5F6570",
  paper: "#F8F3EA",
  cream: "#FFF9EF",
  red: "#C53B2F",
  redDark: "#8E241F",
  gold: "#D6A73E",
  teal: "#157A7E",
  blue: "#244C8F",
  dark: "#101820",
  white: "#FFFFFF",
  line: "#E5D8C6",
};

const titleStyle = { fontSize: 62, bold: true, color: C.ink, fontFace: "Aptos Display" };
const subtitleStyle = { fontSize: 28, color: C.muted, fontFace: "Aptos" };
const bodyStyle = { fontSize: 28, color: C.ink, fontFace: "Aptos" };
const smallStyle = { fontSize: 18, color: C.muted, fontFace: "Aptos" };

function addSlide(p, node, bg = C.paper) {
  const slide = p.slides.add();
  slide.compose(
    layers({ name: "slide", width: fill, height: fill }, [
      shape({ name: "background", width: fill, height: fill, fill: bg }),
      node,
    ]),
    { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 },
  );
}

function tag(label, color = C.red) {
  return panel(
    {
      name: `tag-${label}`,
      padding: { x: 18, y: 8 },
      fill: color,
      borderRadius: "rounded-full",
      height: hug,
      width: hug,
    },
    text(label, { height: hug, style: { fontSize: 18, bold: true, color: C.white, fontFace: "Aptos" } }),
  );
}

function bullet(label, body, accent = C.red) {
  return row({ width: fill, height: hug, gap: 18, align: "start" }, [
    shape({ width: fixed(16), height: fixed(16), fill: accent, borderRadius: "rounded-full" }),
    column({ width: fill, height: hug, gap: 4 }, [
      text(label, { width: fill, height: hug, style: { ...bodyStyle, bold: true, fontSize: 26 } }),
      text(body, { width: fill, height: hug, style: { ...subtitleStyle, fontSize: 23 } }),
    ]),
  ]);
}

function footer(textValue) {
  return text(textValue, {
    name: "footer",
    width: fill,
    height: hug,
    style: { ...smallStyle, fontSize: 15, color: "#8A8175" },
  });
}

function titleBlock(title, subtitle) {
  return column({ name: "title-block", width: fill, height: hug, gap: 16 }, [
    text(title, { name: "slide-title", width: fill, height: hug, style: titleStyle }),
    subtitle
      ? text(subtitle, { name: "slide-subtitle", width: wrap(1320), height: hug, style: subtitleStyle })
      : null,
  ].filter(Boolean));
}

function phoneMock() {
  return panel(
    {
      name: "phone-frame",
      width: fixed(410),
      height: fixed(760),
      fill: "#111318",
      borderRadius: 36,
      padding: { x: 24, y: 28 },
    },
    column({ width: fill, height: fill, gap: 18 }, [
      row({ width: fill, height: fixed(38), justify: "between", align: "center" }, [
        text("Theatre Reservations", { height: hug, style: { fontSize: 18, bold: true, color: C.white } }),
        shape({ width: fixed(42), height: fixed(8), fill: "#30343B", borderRadius: "rounded-full" }),
      ]),
      panel(
        { width: fill, height: fixed(142), fill: C.red, borderRadius: 24, padding: 18 },
        column({ width: fill, height: fill, gap: 10, justify: "end" }, [
          text("Apollo Theatre", { width: fill, height: hug, style: { fontSize: 28, bold: true, color: C.white } }),
          text("Athens Center · Main Hall", { width: fill, height: hug, style: { fontSize: 16, color: "#FFE1D6" } }),
        ]),
      ),
      grid({ width: fill, height: hug, columns: [fr(1), fr(1)], columnGap: 12, rowGap: 12 }, [
        panel({ height: fixed(92), fill: "#242833", borderRadius: 18, padding: 14 },
          column({ gap: 6 }, [
            text("Antigone", { height: hug, style: { fontSize: 20, bold: true, color: C.white } }),
            text("Drama · 95 min", { height: hug, style: { fontSize: 14, color: "#AAB3C0" } }),
          ])),
        panel({ height: fixed(92), fill: "#242833", borderRadius: 18, padding: 14 },
          column({ gap: 6 }, [
            text("Oppenheimer", { height: hug, style: { fontSize: 20, bold: true, color: C.white } }),
            text("Premiere IMAX", { height: hug, style: { fontSize: 14, color: "#AAB3C0" } }),
          ])),
      ]),
      panel({ width: fill, height: fixed(310), fill: "#1A1E26", borderRadius: 24, padding: 18 },
        column({ width: fill, height: fill, gap: 16 }, [
          text("Seat map", { height: hug, style: { fontSize: 21, bold: true, color: C.white } }),
          grid({ width: fill, height: hug, columns: Array(8).fill(fr(1)), columnGap: 7, rowGap: 8 },
            Array.from({ length: 48 }, (_, i) =>
              shape({
                width: fixed(26),
                height: fixed(22),
                fill: i % 11 === 0 ? "#566070" : i % 7 === 0 ? C.gold : i % 5 === 0 ? C.teal : "#E8ECF2",
                borderRadius: 6,
              }),
            )),
          row({ width: fill, gap: 12 }, [
            tag("VIP", C.gold),
            tag("Selected", C.teal),
            tag("Reserved", "#566070"),
          ]),
        ])),
    ]),
  );
}

function makeDeck() {
  const p = Presentation.create({ slideSize: { width: W, height: H } });

  addSlide(
    p,
    grid({ width: fill, height: fill, columns: [fr(1.1), fr(0.9)], padding: { x: 96, y: 78 }, columnGap: 70 }, [
      column({ width: fill, height: fill, justify: "between" }, [
        column({ width: fill, gap: 34 }, [
          tag("CN6035 · Mobile + API + Database", C.red),
          text("Theatre Reservations", {
            name: "cover-title",
            width: wrap(960),
            height: hug,
            style: { fontSize: 96, bold: true, color: C.ink, fontFace: "Aptos Display" },
          }),
          text("Πώς, πού και με τι υλοποιήθηκε η εργασία", {
            width: wrap(820),
            height: hug,
            style: { fontSize: 34, color: C.muted, fontFace: "Aptos" },
          }),
        ]),
        footer("React Native + Expo · Node.js/Express REST API · Supabase PostgreSQL/Auth"),
      ]),
      column({ width: fill, height: fill, align: "center", justify: "center" }, [
        phoneMock(),
      ]),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 44 }, [
      titleBlock("Τι έφτιαξα", "Μια ολοκληρωμένη εφαρμογή κρατήσεων για θέατρα και προβολές cinema, με πραγματική ροή χρήστη από login μέχρι επιλογή θέσης."),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], columnGap: 28 }, [
        panel({ fill: C.cream, borderRadius: 24, padding: 30, height: fill },
          column({ gap: 22 }, [
            tag("Frontend", C.teal),
            text("Mobile app σε Expo Go", { width: fill, height: hug, style: { ...bodyStyle, bold: true, fontSize: 34 } }),
            text("Ο χρήστης βλέπει θέατρα, παραστάσεις, ώρες προβολής και χάρτη θέσεων μέσα από React Native UI.", { width: fill, height: hug, style: { ...subtitleStyle, fontSize: 24 } }),
          ])),
        panel({ fill: C.cream, borderRadius: 24, padding: 30, height: fill },
          column({ gap: 22 }, [
            tag("Backend", C.red),
            text("REST API σε Express", { width: fill, height: hug, style: { ...bodyStyle, bold: true, fontSize: 34 } }),
            text("Οι λειτουργίες χωρίστηκαν σε routes, controllers, validation schemas και middleware για authentication.", { width: fill, height: hug, style: { ...subtitleStyle, fontSize: 24 } }),
          ])),
        panel({ fill: C.cream, borderRadius: 24, padding: 30, height: fill },
          column({ gap: 22 }, [
            tag("Database", C.blue),
            text("Supabase PostgreSQL", { width: fill, height: hug, style: { ...bodyStyle, bold: true, fontSize: 34 } }),
            text("Η βάση κρατά theatres, shows, showtimes, seats και reservations με κλειδιά, RLS policies και RPC functions.", { width: fill, height: hug, style: { ...subtitleStyle, fontSize: 24 } }),
          ])),
      ]),
      footer("Πηγή: solution/README.md, solution/api, solution/mobile, solution/supabase/schema.sql"),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 40 }, [
      titleBlock("Πού έγινε η υλοποίηση", "Η εργασία οργανώθηκε σε τρία βασικά μέρη ώστε κάθε επίπεδο του distributed system να είναι καθαρό."),
      grid({ width: fill, height: fill, columns: [fr(0.9), fr(1.1)], columnGap: 56 }, [
        column({ width: fill, gap: 26, justify: "center" }, [
          bullet("solution/mobile", "React Native screens, API client, secure token storage και UI κρατήσεων.", C.teal),
          bullet("solution/api", "Express server, REST routes, controllers, Zod validation και Supabase client.", C.red),
          bullet("solution/supabase", "SQL schema, sample data, RLS policies και functions για κρατήσεις.", C.blue),
        ]),
        panel({ fill: C.dark, borderRadius: 28, padding: 34, height: fill },
          column({ gap: 18 }, [
            text("Project structure", { height: hug, style: { fontSize: 26, bold: true, color: C.white } }),
            text("solution/\n  mobile/     Expo React Native app\n  api/        Node.js + Express REST API\n  supabase/   PostgreSQL schema + seed data", {
              width: fill,
              height: hug,
              style: { fontSize: 34, color: "#F8E9C8", fontFace: "Cascadia Mono" },
            }),
            rule({ width: fill, stroke: "#38414C", weight: 2 }),
            text("Με αυτόν τον διαχωρισμό η εφαρμογή διαβάζεται εύκολα: client, server και database έχουν ξεκάθαρο ρόλο.", {
              width: fill,
              height: hug,
              style: { fontSize: 24, color: "#C9D2DC" },
            }),
          ])),
      ]),
      footer("Ο φάκελος της εργασίας βρίσκεται στο C:\\Users\\styli\\Downloads\\theater"),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 38 }, [
      titleBlock("Πώς δουλεύει η αρχιτεκτονική", "Η εφαρμογή ακολουθεί την κλασική ροή mobile client → REST API → database/auth provider."),
      grid({ width: fill, height: fill, columns: [fr(1), auto, fr(1), auto, fr(1)], columnGap: 24, alignItems: "center" }, [
        panel({ fill: "#E7F5F5", borderRadius: 28, padding: 32, height: fixed(360) },
          column({ gap: 16, justify: "center", align: "center" }, [
            text("1", { height: hug, style: { fontSize: 70, bold: true, color: C.teal } }),
            text("Mobile App", { height: hug, style: { fontSize: 36, bold: true, color: C.ink } }),
            text("Expo Go\nReact Native UI", { height: hug, style: { fontSize: 24, color: C.muted } }),
          ])),
        text("→", { width: fixed(70), height: hug, style: { fontSize: 64, color: C.red, bold: true } }),
        panel({ fill: "#FCE9E4", borderRadius: 28, padding: 32, height: fixed(360) },
          column({ gap: 16, justify: "center", align: "center" }, [
            text("2", { height: hug, style: { fontSize: 70, bold: true, color: C.red } }),
            text("REST API", { height: hug, style: { fontSize: 36, bold: true, color: C.ink } }),
            text("Express routes\nJWT middleware", { height: hug, style: { fontSize: 24, color: C.muted } }),
          ])),
        text("→", { width: fixed(70), height: hug, style: { fontSize: 64, color: C.red, bold: true } }),
        panel({ fill: "#EAF0FC", borderRadius: 28, padding: 32, height: fixed(360) },
          column({ gap: 16, justify: "center", align: "center" }, [
            text("3", { height: hug, style: { fontSize: 70, bold: true, color: C.blue } }),
            text("Supabase", { height: hug, style: { fontSize: 36, bold: true, color: C.ink } }),
            text("PostgreSQL\nAuth + RLS + RPC", { height: hug, style: { fontSize: 24, color: C.muted } }),
          ])),
      ]),
      footer("Protected API calls use Authorization: Bearer <supabase-access-token>"),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 38 }, [
      titleBlock("Με τι τεχνολογίες", "Επέλεξα εργαλεία που καλύπτουν καθαρά frontend, backend, authentication και relational database."),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 52 }, [
        column({ gap: 24, justify: "center" }, [
          bullet("React Native + Expo", "Για γρήγορο mobile development και δοκιμή με Expo Go.", C.teal),
          bullet("Expo Secure Store", "Για αποθήκευση token με ασφαλέστερο τρόπο στο κινητό.", C.teal),
          bullet("Node.js + Express", "Για REST endpoints και απλή, καθαρή σύνδεση client-server.", C.red),
        ]),
        column({ gap: 24, justify: "center" }, [
          bullet("Supabase Auth", "Για registration/login και JWT access tokens.", C.blue),
          bullet("Supabase PostgreSQL", "Για relational tables, keys, indexes και πολιτικές RLS.", C.blue),
          bullet("Zod + middleware", "Για validation στα requests και έλεγχο πρόσβασης στα protected routes.", C.gold),
        ]),
      ]),
      footer("Κύριες dependencies: expo, react-native, express, @supabase/supabase-js, zod, helmet, cors"),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 36 }, [
      titleBlock("Η ροή του χρήστη", "Η εφαρμογή σχεδιάστηκε γύρω από τη φυσική διαδικασία μιας κράτησης."),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1), fr(1)], columnGap: 22 }, [
        ["Εγγραφή / Login", "Ο χρήστης μπαίνει με email και password μέσω Supabase Auth.", C.red],
        ["Αναζήτηση", "Φιλτράρει θέατρα, τοποθεσίες, τίτλους, κατηγορίες και προβολές.", C.teal],
        ["Επιλογή θέσης", "Βλέπει visual seat map με VIP, premium, standard και reserved seats.", C.gold],
        ["Κράτηση", "Δημιουργεί, αλλάζει, ακυρώνει και βλέπει ιστορικό κρατήσεων.", C.blue],
      ].map(([h, b, color], i) =>
        column({ width: fill, height: fill, gap: 20 }, [
          text(`0${i + 1}`, { height: hug, style: { fontSize: 80, bold: true, color } }),
          rule({ width: fixed(160), stroke: color, weight: 5 }),
          text(h, { width: fill, height: hug, style: { fontSize: 34, bold: true, color: C.ink } }),
          text(b, { width: fill, height: hug, style: { ...subtitleStyle, fontSize: 23 } }),
        ]),
      )),
      footer("Main API routes: /register, /login, /theatres, /shows, /showtimes, /seats, /reservations"),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 38 }, [
      titleBlock("Πώς προστατεύονται οι κρατήσεις", "Το πιο σημαντικό κομμάτι δεν είναι μόνο να φαίνεται μια θέση, αλλά να μην μπορεί να κρατηθεί λάθος ή διπλά."),
      grid({ width: fill, height: fill, columns: [fr(1.05), fr(0.95)], columnGap: 52 }, [
        column({ gap: 24, justify: "center" }, [
          bullet("JWT protected routes", "Οι κρατήσεις απαιτούν token, άρα κάθε request συνδέεται με συγκεκριμένο user.", C.red),
          bullet("Row Level Security", "Ο χρήστης βλέπει μόνο το δικό του profile και τις δικές του κρατήσεις.", C.blue),
          bullet("RPC functions", "Η δημιουργία και ενημέρωση κράτησης ελέγχει seat availability μέσα στη βάση.", C.teal),
          bullet("Seat locking", "Οι θέσεις κλειδώνονται στο transaction ώστε να αποφευχθούν διπλές κρατήσεις.", C.gold),
        ]),
        panel({ fill: C.dark, borderRadius: 28, padding: 34, height: fill },
          column({ gap: 16 }, [
            tag("Database logic", C.blue),
            text("create_reservation()", { width: fill, height: hug, style: { fontSize: 42, bold: true, color: C.white, fontFace: "Cascadia Mono" } }),
            text("1. Ελέγχει user profile\n2. Ελέγχει future showtime\n3. Κλειδώνει τις θέσεις\n4. Υπολογίζει total price\n5. Γράφει reservation + seats", {
              width: fill,
              height: hug,
              style: { fontSize: 28, color: "#F8E9C8", fontFace: "Cascadia Mono" },
            }),
          ])),
      ]),
      footer("Υλοποίηση στο solution/supabase/schema.sql"),
    ]),
  );

  addSlide(
    p,
    column({ width: fill, height: fill, padding: { x: 92, y: 72 }, gap: 38 }, [
      titleBlock("Τελικό αποτέλεσμα", "Η εργασία καλύπτει την ζητούμενη distributed system λογική με mobile frontend, REST backend και database/auth layer."),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 52 }, [
        column({ gap: 24, justify: "center" }, [
          bullet("Καθαρή δομή", "Το project χωρίζεται σε mobile, API και Supabase schema.", C.teal),
          bullet("Πλήρης λειτουργικότητα", "Registration, login, browsing, search, seat map, create/update/cancel reservations.", C.red),
          bullet("Ασφάλεια", "JWT, middleware, RLS policies και backend-only service role key.", C.blue),
        ]),
        panel({ fill: C.cream, borderRadius: 32, padding: 38, height: fill },
          column({ gap: 28, justify: "center" }, [
            text("Με απλά λόγια:", { height: hug, style: { fontSize: 30, color: C.muted } }),
            text("Έφτιαξα μια εφαρμογή που μοιάζει με πραγματικό σύστημα κρατήσεων, όχι απλώς με στατική οθόνη.", {
              width: fill,
              height: hug,
              style: { fontSize: 52, bold: true, color: C.ink, fontFace: "Aptos Display" },
            }),
            rule({ width: fixed(260), stroke: C.red, weight: 6 }),
            text("Το frontend μιλάει με API, το API ελέγχει τον χρήστη, και η βάση διαχειρίζεται αξιόπιστα τα δεδομένα των κρατήσεων.", {
              width: fill,
              height: hug,
              style: { ...subtitleStyle, fontSize: 26 },
            }),
          ])),
      ]),
      footer("Deck generated from local assignment files in the theater workspace"),
    ]),
  );

  return p;
}

const presentation = makeDeck();
const pptxBlob = await PresentationFile.exportPptx(presentation);
await pptxBlob.save("output/output.pptx");

console.log("output/output.pptx");
