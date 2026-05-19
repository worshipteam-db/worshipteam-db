import CardNav from "./CardNav";
import "./App.css";

const items = [
  {
    label: "Songs",
    bgColor: "#1B1722",
    textColor: "#fff",
    links: [
      { label: "Browse Songs", ariaLabel: "Browse Songs", href: "#songs" },
      { label: "Add New Song", ariaLabel: "Add New Song", href: "#songs" }
    ]
  },
  {
    label: "Leaders",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Browse Leaders", ariaLabel: "Browse Leaders", href: "#leaders" },
      { label: "Add Leader", ariaLabel: "Add Leader", href: "#leaders" }
    ]
  },
  {
    label: "Calendar",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Open Calendar", ariaLabel: "Open Calendar", href: "#calendar" },
      { label: "View Archive", ariaLabel: "View Archive", href: "#archive" }
    ]
  }
];

function SectionCard({ id, kicker, title, description, accent, children }) {
  return (
    <section className="section-card" id={id} style={{ borderColor: accent }}>
      <p className="section-kicker" style={{ color: accent }}>
        {kicker}
      </p>
      <h2>{title}</h2>
      <p className="section-copy">{description}</p>
      {children}
    </section>
  );
}

function smoothScrollToHash(hash) {
  const id = hash.replace("#", "");
  const target = document.getElementById(id);

  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  target.animate(
    [
      { transform: "scale(0.99)", opacity: 0.92 },
      { transform: "scale(1)", opacity: 1 }
    ],
    {
      duration: 240,
      easing: "ease-out"
    }
  );
}

export default function App() {
  return (
    <main className="app-shell">
     <CardNav
  logo="/vite.svg"
  logoAlt="WorshipTeam DB Logo"
  items={items}
  baseColor="#f4f5f7"
  menuColor="#111"
  buttonBgColor="#111"
  buttonTextColor="#fff"
  ease="power3.out"
  theme="light"
  onLinkClick={smoothScrollToHash}
/>

      <section className="hero-card">
        <p className="eyebrow">
          Life City Church Of Christ Main&apos;s Worship Team Planning System
        </p>

        <h1>WorshipTeam DB</h1>

        <p className="hero-copy">
          A modern worship planning system designed for songs, leaders, weekly
          setlists, archives, and ministry coordination.
        </p>

        <div className="hero-actions">
          <a className="primary-btn link-btn" href="#calendar">
            Open Calendar
          </a>
          <a className="secondary-btn link-btn" href="#stack">
            View Stack
          </a>
        </div>
      </section>

      <SectionCard
        id="songs"
        kicker="Songs"
        title="Song Library"
        description="A searchable, categorized worship song database with original artist, tags, language, and YouTube references."
        accent="#ffb15c"
      />

      <SectionCard
        id="leaders"
        kicker="Leaders"
        title="Leader Profiles"
        description="A shared worship leader list with active and inactive status tracking and leader-based planning."
        accent="#79f2c0"
      />

      <SectionCard
        id="calendar"
        kicker="Calendar"
        title="Weekly Service Planning"
        description="A Sunday-focused planning area for setlists, keys, rehearsal workflow, and service archiving."
        accent="#63c0ff"
      />

      <SectionCard
        id="archive"
        kicker="Archive"
        title="Service Archive"
        description="A historical view of previous Sundays and the worship lineups that were used."
        accent="#d39cff"
      />

      <SectionCard
        id="stack"
        kicker="Stack"
        title="Project Stack"
        description="A clean summary of the tools, systems, and future enhancement paths used in the project."
        accent="#ff6b7d"
      />
    </main>
  );
}