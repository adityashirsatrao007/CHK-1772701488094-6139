import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";

const API = "http://127.0.0.1:8000";

const CATEGORY_COLORS = {
  "Offences Against Women": "bg-rose-900/40 text-rose-300 border-rose-700/50",
  "Offences Against Human Body": "bg-red-900/40 text-red-300 border-red-700/50",
  "Offences Against Property": "bg-orange-900/40 text-orange-300 border-orange-700/50",
  "Organized Crime & Conspiracy": "bg-purple-900/40 text-purple-300 border-purple-700/50",
  "Against the State": "bg-blue-900/40 text-blue-300 border-blue-700/50",
  "Offences Relating to Documents": "bg-yellow-900/40 text-yellow-300 border-yellow-700/50",
  "Offences Against Public Tranquility": "bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  "Offences Against Public Authority": "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
  "Offences Affecting Reputation": "bg-pink-900/40 text-pink-300 border-pink-700/50",
  default: "bg-stone-800/60 text-stone-300 border-stone-700/50",
};

function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
}

const SUGGESTIONS = [
  "murder", "theft", "rape", "domestic violence", "fraud", "stalking",
  "rash driving", "kidnapping", "forgery", "extortion", "rioting", "defamation",
];

export default function LegalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API}/legal/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const runSearch = useCallback(
    async (q, cat) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/legal/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 10, category: cat }),
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.results || []);
        setSearched(true);
      } catch (e) {
        setError("Could not connect to the search service. Make sure the backend is running.");
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(val, activeCategory);
    }, 380);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    if (query.trim()) runSearch(query, cat);
  };

  const handleSuggestion = (s) => {
    setQuery(s);
    runSearch(s, activeCategory);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceRef.current);
      runSearch(query, activeCategory);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100">
      <NavBar />

      {/* ── Hero / Search Zone ───────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-12 px-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[700px] h-[320px] rounded-full bg-amber-600/10 blur-[120px] mt-10" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-3">
              Semantic Legal Intelligence
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold font-serif leading-tight text-white">
              Search IPC &amp;{" "}
              <span className="text-amber-400">Legal Sections</span>
            </h1>
            <p className="mt-3 text-stone-400 text-base sm:text-lg max-w-xl mx-auto">
              Describe a situation, crime, or section number — our vector search
              surfaces the most relevant IPC sections instantly.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative mt-6"
          >
            <div className="relative flex items-center bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl focus-within:border-amber-500/70 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all duration-300">
              <span className="pl-5 text-stone-500 text-xl select-none">⚖️</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 'murder', 'dowry harassment', 'IPC 420', 'forgery'…"
                className="flex-1 bg-transparent px-4 py-4 text-base text-stone-100 placeholder-stone-500 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {loading ? (
                <span className="pr-5 text-amber-400 animate-spin text-lg">⟳</span>
              ) : query ? (
                <button
                  onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
                  className="pr-5 text-stone-500 hover:text-stone-300 transition-colors text-lg"
                  aria-label="Clear"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </motion.div>

          {/* Suggestion chips */}
          {!searched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-2 pt-2"
            >
              <span className="text-stone-500 text-sm self-center">Try:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-stone-400 hover:bg-stone-700 hover:text-amber-400 hover:border-amber-500/40 transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Results Section ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        {/* Category filters */}
        {searched && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            <CategoryChip
              label="All"
              active={activeCategory === "all"}
              onClick={() => handleCategoryChange("all")}
            />
            {categories.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => handleCategoryChange(cat)}
              />
            ))}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-950/50 border border-red-800/60 rounded-xl p-4 text-red-300 text-sm mb-6"
          >
            ⚠ {error}
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-stone-900/80 border border-stone-800 rounded-2xl animate-pulse"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && (
          <AnimatePresence mode="popLayout">
            {results.map((r, idx) => (
              <ResultCard
                key={r.section}
                result={r}
                idx={idx}
                expanded={expanded === r.section}
                onToggle={() =>
                  setExpanded(expanded === r.section ? null : r.section)
                }
              />
            ))}
          </AnimatePresence>
        )}

        {/* Empty state */}
        {searched && !loading && results.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-3"
          >
            <p className="text-5xl">🔍</p>
            <p className="text-stone-400 text-lg">No sections matched your query.</p>
            <p className="text-stone-600 text-sm">
              Try different keywords — e.g. "theft", "assault", "IPC 302".
            </p>
          </motion.div>
        )}

        {/* Free resources panel */}
        {!searched && (
          <FreeResourcesPanel />
        )}
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200 ${
        active
          ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20"
          : "bg-stone-900 text-stone-400 border-stone-700 hover:border-amber-500/40 hover:text-amber-400"
      }`}
    >
      {label}
    </button>
  );
}

function ResultCard({ result, idx, expanded, onToggle }) {
  const catClass = categoryColor(result.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, delay: idx * 0.05 }}
      className="mb-4"
    >
      <div
        className={`bg-stone-900/80 border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
          expanded
            ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
            : "border-stone-800 hover:border-stone-600"
        }`}
        onClick={onToggle}
      >
        {/* Card Header */}
        <div className="flex items-start gap-4 p-5">
          {/* Section badge */}
          <div className="shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-900/30 border border-amber-500/30 flex flex-col items-center justify-center">
            <span className="text-xs text-amber-500/70 font-mono uppercase tracking-wide">
              {result.section.includes("IPC") ? "IPC" : "Sec"}
            </span>
            <span className="text-amber-400 font-bold text-lg leading-tight font-mono">
              {result.section.replace("IPC ", "")}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-white font-semibold text-base leading-snug">
                {result.title}
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${catClass}`}
              >
                {result.category}
              </span>
            </div>

            <p className="text-stone-400 text-sm line-clamp-2 leading-relaxed">
              {result.description}
            </p>

            {/* Quick badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                label={result.bailable ? "Bailable" : "Non-Bailable"}
                variant={result.bailable ? "green" : "red"}
              />
              <Badge
                label={result.cognizable ? "Cognizable" : "Non-Cognizable"}
                variant={result.cognizable ? "blue" : "stone"}
              />
              {result.bhns_equivalent && (
                <Badge
                  label={result.bhns_equivalent}
                  variant="amber"
                  icon="⚡"
                />
              )}
            </div>
          </div>

          {/* Expand arrow */}
          <span
            className={`text-stone-500 shrink-0 mt-1 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </div>

        {/* Expanded Detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div
                className="border-t border-stone-800 px-5 py-5 space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Full Description */}
                <div>
                  <Label>Full Description</Label>
                  <p className="text-stone-300 text-sm leading-relaxed mt-1">
                    {result.description}
                  </p>
                </div>

                {/* Punishment */}
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">
                  <Label icon="⚖" color="text-red-400">Punishment</Label>
                  <p className="text-red-200 text-sm mt-1 leading-relaxed">
                    {result.punishment}
                  </p>
                </div>

                {/* Keywords */}
                <div>
                  <Label icon="🔑">Related Keywords</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {result.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-xs px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Free Resources */}
                {result.resources && result.resources.length > 0 && (
                  <div>
                    <Label icon="🌐">Free Legal Resources</Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {result.resources.map((res) => (
                        <a
                          key={res.name}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-amber-400 hover:bg-stone-700 hover:border-amber-500/50 transition-all duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗ {res.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const BADGE_VARIANTS = {
  green: "bg-green-900/40 text-green-300 border-green-700/50",
  red: "bg-red-900/40 text-red-300 border-red-700/50",
  blue: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  stone: "bg-stone-800/60 text-stone-400 border-stone-700/50",
  amber: "bg-amber-900/40 text-amber-300 border-amber-700/50",
};

function Badge({ label, variant = "stone", icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${BADGE_VARIANTS[variant]}`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}

function Label({ children, icon, color = "text-stone-500" }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-wider ${color}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </p>
  );
}

function FreeResourcesPanel() {
  const resources = [
    {
      name: "Indian Kanoon",
      desc: "Free, searchable database of Indian court judgments and bare acts. The most comprehensive free legal resource for India.",
      url: "https://indiankanoon.org",
      icon: "🏛",
      tag: "Case Law & Acts",
    },
    {
      name: "India Code",
      desc: "Official digital repository of all Central Acts by the Ministry of Law and Justice, Government of India.",
      url: "https://www.indiacode.nic.in",
      icon: "📜",
      tag: "Official Government",
    },
    {
      name: "Legislative.gov.in",
      desc: "The official site of India's Legislative Department offering IPC, CrPC, and all major Acts in full text.",
      url: "https://legislative.gov.in",
      icon: "⚖️",
      tag: "Legislation",
    },
    {
      name: "NALSA",
      desc: "National Legal Services Authority — provides free legal aid. Apply online for legal help.",
      url: "https://nalsa.gov.in",
      icon: "🤝",
      tag: "Free Legal Aid",
    },
    {
      name: "eCourts India",
      desc: "Track your case status, view causelists and judgments from District Courts across India.",
      url: "https://ecourts.gov.in",
      icon: "🖥",
      tag: "Court Services",
    },
    {
      name: "National Cyber Crime Portal",
      desc: "Report cyber crimes online. Dedicated platform for cybercrime complaints under MHA.",
      url: "https://cybercrime.gov.in",
      icon: "🛡",
      tag: "Cyber Crime",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-800" />
        <p className="text-stone-500 text-sm font-medium uppercase tracking-widest">
          Free Legal Resources
        </p>
        <div className="flex-1 h-px bg-stone-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((r, i) => (
          <motion.a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="group bg-stone-900/70 border border-stone-800 rounded-2xl p-5 hover:border-amber-500/50 hover:bg-stone-900 transition-all duration-300 no-underline"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{r.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {r.tag}
              </span>
            </div>
            <h4 className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">
              {r.name}
            </h4>
            <p className="text-stone-500 text-xs mt-1.5 leading-relaxed line-clamp-3">
              {r.desc}
            </p>
            <p className="mt-3 text-amber-600 text-xs font-medium group-hover:text-amber-400 transition-colors">
              Open resource ↗
            </p>
          </motion.a>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 text-stone-500 text-xs leading-relaxed">
        <strong className="text-stone-400">⚠ Disclaimer:</strong> The information provided here is
        for educational and informational purposes only. IPC sections may have been amended. For legal
        advice or action, please consult a qualified advocate. Note: The Bharatiya Nyaya Sanhita (BNS)
        2023 has replaced the IPC effective July 1, 2024 — BNS equivalents are shown where applicable.
      </div>
    </motion.div>
  );
}
