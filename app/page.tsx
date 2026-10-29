"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AccountHeader from "../components/AccountHeader";
import LevelRecords from "../components/LevelRecords";
import NotificationBell from "../components/NotificationBell";

// ============================================================
// TYPES
// ============================================================

type Level = {
  id: string;
  name: string;
  position: number;
  creator: string | null;
  publisher: string | null;
  verifier: string | null;
  gd_level_id: string | number | null;
  youtube_url: string | null;
  image_url: string | null;
  description: string | null;
  cps: string | null;
  difficulty_class: string | null;
  level_length: string | null;
  list_percentage: number | null;
  predicted_position: number | null;
  wr_user: string | null;
  wr_percent: number | null;
  song_name: string | null;
};

type List = {
  id: string;
  slug: string;
  name: string;
};

type Tag = {
  id: string;
  name: string;
  description: string | null;
};

type LevelTag = {
  level_id: string;
  tag_id: string;
};

type HistoryEntry = {
  id: string;
  level_id: string;
  old_position: number | null;
  new_position: number | null;
  created_at: string;
};

type LevelPoints = {
  level_id: string;
  list_id: string;
  position: number;
  points: number | string;
};

type FilterSettings = {
  rankMin: string;
  rankMax: string;
  percentageMin: string;
  percentageMax: string;
  media: "all" | "youtube" | "image" | "none";
  verification: "all" | "verified" | "unverified";
  predictionMin: string;
  predictionMax: string;
  tagIds: string[];
  tagMode: "all" | "any";
};

const EMPTY_FILTERS: FilterSettings = {
  rankMin: "", rankMax: "", percentageMin: "", percentageMax: "",
  media: "all", verification: "all", predictionMin: "", predictionMax: "",
  tagIds: [], tagMode: "all",
};

const FILTER_TAG_GROUPS: Record<string, string[]> = {
  "GAME VERSION": ["2.2", "2.1", "2.0", "1.9"],
  "LEVEL LENGTH": ["Medium", "Long", "XL", "XXL", "XXL+"],
  "SPECIAL FEATURES": ["NONG", "2P", "Circles", "Gimmicky", "Learny", "Memory"],
  "GAMEPLAY STYLE": ["Slow-Paced", "Fast-Paced", "Clicksync", "Flow", "Mirror"],
  "DIFFICULTY CHARACTERISTICS": ["Nerve Control", "Consistency", "Chokepoints", "High CPS", "Timings", "Precision", "Unbalanced", "End-Heavy", "Beginning-Heavy", "Physically Demanding"],
  GAMEMODES: ["Overall", "Cube", "Ship", "Ball", "UFO", "Wave", "Robot", "Spider", "Swing", "Old Swing", "Duals"],
  "ILL EXCLUSIVE": ["Swift Clicks", "Alignments", "Macrobuffs", "MINUSwave", "30+ CPS", "50+ CPS", "100+ CPS", "250+ CPS", "500+ CPS", "1000+ CPS", "Googology", "Theoretically Possible", "Humanly Impossible", "Humanly Possible", "FPS Bypass", "Counter", "Snap", "Mechanically Impossible", "Unverified Possibility", "TAS-Only", "Frame Perfects", "Consecutive Frame Perfects", "Subframe Precision", "Tick Perfects", "Zero Margin", "Pixel Perfect", "Subpixel Precision", "Perfect Trajectory", "Hitbox Abuse", "TAS Verified", "Bot Verified", "Simulation Verified", "Unsolved", "Version-Locked"],
};

function tagGroup(name: string): string {
  return Object.entries(FILTER_TAG_GROUPS).find(([, names]) => names.includes(name))?.[0] ?? "OTHER TAGS";
}

type Tooltip = {
  text: string;
  x: number;
  y: number;
};

// ============================================================
// HELPERS
// ============================================================

function youtubeId(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    let id: string | null = null;

    if (
      host === "youtu.be" ||
      host === "www.youtu.be"
    ) {
      id = parsed.pathname.split("/")[1];
    } else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else if (
        /^\/(embed|shorts|live)\//.test(
          parsed.pathname
        )
      ) {
        id = parsed.pathname.split("/")[2];
      }
    }

    return id && /^[a-zA-Z0-9_-]{11}$/.test(id)
      ? id
      : null;
  } catch {
    return null;
  }
}

function formatPoints(
  value: number | null | undefined
): string {
  return value != null && Number.isFinite(value)
    ? value.toFixed(2)
    : "—";
}

function partialPoints(
  fullPoints: number | undefined,
  percentage: number | null
): number | null {
  if (
    fullPoints == null ||
    !Number.isFinite(fullPoints) ||
    percentage == null ||
    !Number.isInteger(percentage) ||
    percentage < 1 ||
    percentage > 99
  ) {
    return null;
  }

  return Math.round(fullPoints * 50) / 100;
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="border-r border-white/20 px-2 text-center">
      <p className="mb-2 text-sm text-orange-500">
        {title}
      </p>

      <p className="break-words text-2xl sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-24 shrink-0 text-orange-500">
        {label}
      </span>

      <span className="text-gray-300">
        {value}
      </span>
    </div>
  );
}

// ============================================================
// PUBLIC HOMEPAGE
// ============================================================

export default function Home() {
  const [lists, setLists] = useState<List[]>([]);

  const [activeList, setActiveList] =
    useState("demon");

  const [openDropdown, setOpenDropdown] =
    useState<string | null>(null);

  const [levels, setLevels] = useState<Level[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [points, setPoints] = useState<
    Record<string, number>
  >({});

  const [pointsLoading, setPointsLoading] =
    useState(false);

  const [pointsError, setPointsError] =
    useState("");

  const [tags, setTags] = useState<Tag[]>([]);

  const [levelTags, setLevelTags] = useState<
    LevelTag[]
  >([]);
  const [tagsError, setTagsError] = useState("");

  const [history, setHistory] = useState<
    HistoryEntry[]
  >([]);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [search, setSearch] = useState("");

  const [selectedTag, setSelectedTag] =
    useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterSettings>({ ...EMPTY_FILTERS });
  const [draftFilters, setDraftFilters] = useState<FilterSettings>({ ...EMPTY_FILTERS });
  const [filterTagSearch, setFilterTagSearch] = useState("");

  function openFilters() {
    setDraftFilters({ ...filters, tagIds: [...filters.tagIds] });
    setFilterTagSearch("");
    setFiltersOpen(true);
  }

  function updateDraft<K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) {
    setDraftFilters((previous) => ({ ...previous, [key]: value }));
  }

  const activeFilterCount = [
    filters.rankMin, filters.rankMax, filters.percentageMin, filters.percentageMax,
    filters.media !== "all", filters.verification !== "all",
    ...(activeList === "future-demon" ? [filters.predictionMin, filters.predictionMax] : []),
    ...filters.tagIds,
  ].filter(Boolean).length;

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [tooltip, setTooltip] =
    useState<Tooltip | null>(null);

  // ==========================================================
  // CURRENT LIST
  // ==========================================================

  const isFutureList =
    activeList === "future-demon";

  const isImpossibleList =
    activeList === "impossible";

  const currentList = lists.find(
    (list) => list.slug === activeList
  );

  const selectedLevel = levels.find(
    (level) => level.id === selectedId
  );

  const selectedPoints = selectedLevel
    ? points[selectedLevel.id]
    : undefined;

  const percentage =
    selectedLevel?.list_percentage ?? null;

  const partial = partialPoints(
    selectedPoints,
    percentage
  );

  // ==========================================================
  // MEDIA
  //
  // Priority:
  // 1. YouTube video
  // 2. Uploaded image
  // 3. Placeholder
  // ==========================================================

  const videoId = youtubeId(
    selectedLevel?.youtube_url ?? null
  );

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;

  const uploadedImage =
    selectedLevel?.image_url?.trim() || null;

  // Prefer the explicitly uploaded artwork for the background.
  // YouTube maxresdefault is often unavailable for older videos.
  const thumbnail = uploadedImage || (videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null);

  // ==========================================================
  // LOAD LISTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadLists() {
      const { data, error } = await supabase
        .from("lists")
        .select("id, slug, name");

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setLists((data ?? []) as List[]);
    }

    void loadLists();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD TAGS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      // Fetch all pages: Supabase commonly limits queries to 1,000 rows.
      const [tagsResult, assignmentsResult] = await Promise.all([
        supabase.from("tags").select("id, name, description").order("name"),
        supabase.from("level_tags").select("level_id, tag_id").range(0, 999),
      ]);
      if (cancelled) return;

      if (tagsResult.error || assignmentsResult.error) {
        setTagsError(
          "Unable to load public tags: " +
          (tagsResult.error?.message ?? assignmentsResult.error?.message)
        );
        return;
      }

      const assignments: LevelTag[] = (assignmentsResult.data ?? []) as LevelTag[];
      if (assignments.length === 1000) {
        for (let offset = 1000; ; offset += 1000) {
          const page = await supabase
            .from("level_tags")
            .select("level_id, tag_id")
            .range(offset, offset + 999);
          if (cancelled) return;
          if (page.error) {
            setTagsError("Unable to load all tag assignments: " + page.error.message);
            return;
          }
          const rows = (page.data ?? []) as LevelTag[];
          assignments.push(...rows);
          if (rows.length < 1000) break;
        }
      }

      setTags((tagsResult.data ?? []) as Tag[]);
      setLevelTags(assignments);
      setTagsError("");
    }

    void loadTags();
    // Refresh when the viewer regains focus after an admin edit.
    window.addEventListener("focus", loadTags);
    const refresh = window.setInterval(loadTags, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadTags);
      window.clearInterval(refresh);
    };
  }, []);

  // ==========================================================
  // LOAD LEVELS
  // ==========================================================

  useEffect(() => {
    if (!currentList) return;

    let cancelled = false;

    async function loadLevels() {
      setLoading(true);
      setError("");
      setLevels([]);
      setSelectedId(null);
      setHistory([]);

      const { data, error } = await supabase
        .from("levels")
        .select(
          "id, name, position, creator, publisher, verifier, " +
            "gd_level_id, youtube_url, image_url, " +
            "description, cps, difficulty_class, level_length, " +
            "list_percentage, predicted_position, wr_user, wr_percent, song_name"
        )
        .eq("list_id", currentList!.id)
        .order("position", {
          ascending: true,
        });

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        const loaded =
          (data ?? []) as unknown as Level[];

        setLevels(loaded);

        setSelectedId(
          loaded[0]?.id ?? null
        );
      }

      setLoading(false);
    }

    void loadLevels();

    return () => {
      cancelled = true;
    };
  }, [currentList?.id]);

  // ==========================================================
  // LOAD POINTS
  // ==========================================================

  useEffect(() => {
    if (!currentList || isFutureList) {
      setPoints({});
      setPointsError("");
      setPointsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPoints() {
      setPointsLoading(true);
      setPointsError("");
      setPoints({});

      const { data, error } = await supabase
        .from("level_points")
        .select(
          "level_id, list_id, position, points"
        )
        .eq("list_id", currentList!.id);

      if (cancelled) return;

      if (error) {
        setPointsError(error.message);
        setPointsLoading(false);
        return;
      }

      const result: Record<string, number> = {};

      for (
        const row of
        (data ?? []) as LevelPoints[]
      ) {
        const value = Number(row.points);

        if (Number.isFinite(value)) {
          result[row.level_id] = value;
        }
      }

      setPoints(result);
      setPointsLoading(false);
    }

    void loadPoints();

    return () => {
      cancelled = true;
    };
  }, [currentList?.id, isFutureList]);

  // ==========================================================
  // LOAD POSITION HISTORY
  // ==========================================================

  useEffect(() => {
    if (!selectedId) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      const { data, error } = await supabase
        .from("placement_history")
        .select(
          "id, level_id, old_position, new_position, created_at"
        )
        .eq("level_id", selectedId)
        .order("created_at", {
          ascending: false,
        });

      if (cancelled) return;

      setHistory(
        error
          ? []
          : ((data ?? []) as HistoryEntry[])
      );
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // ==========================================================
  // CURRENT LEVEL TAGS
  // ==========================================================

  const currentTags = useMemo(() => {
    if (!selectedId) return [];

    const ids = new Set(
      levelTags
        .filter(
          (entry) =>
            entry.level_id === selectedId
        )
        .map(
          (entry) => entry.tag_id
        )
    );

    return tags.filter(
      (tag) => ids.has(tag.id)
    );
  }, [selectedId, levelTags, tags]);

  // ==========================================================
  // FILTER LEVELS
  // ==========================================================

  const filteredLevels = useMemo(() => {
    const query = search.trim().toLowerCase();
    const within = (value: number | null, minimum: string, maximum: string) => {
      if (!minimum && !maximum) return true;
      if (value == null) return false;
      if (minimum && value < Number(minimum)) return false;
      if (maximum && value > Number(maximum)) return false;
      return true;
    };

    return levels.filter((level) => {
      const matchesSearch = level.name.toLowerCase().includes(query) ||
        (level.creator ?? "").toLowerCase().includes(query);
      const matchesInlineTag = !selectedTag || levelTags.some(
        (entry) => entry.level_id === level.id && entry.tag_id === selectedTag
      );
      const matchesRank = within(level.position, filters.rankMin, filters.rankMax);
      const matchesPercentage = within(level.list_percentage, filters.percentageMin, filters.percentageMax);
      const hasYoutube = youtubeId(level.youtube_url) !== null;
      const hasImage = Boolean(level.image_url?.trim());
      const matchesMedia = filters.media === "all" ||
        (filters.media === "youtube" && hasYoutube) ||
        (filters.media === "image" && hasImage) ||
        (filters.media === "none" && !hasYoutube && !hasImage);
      // For this site, a verifier name indicates verified status.
      const isVerified = Boolean(level.verifier?.trim());
      const matchesVerification = filters.verification === "all" ||
        (filters.verification === "verified" && isVerified) ||
        (filters.verification === "unverified" && !isVerified);
      const matchesPrediction = !isFutureList || within(
        level.predicted_position, filters.predictionMin, filters.predictionMax
      );
      const assigned = new Set(levelTags.filter((entry) => entry.level_id === level.id).map((entry) => entry.tag_id));
      const matchesTags = filters.tagIds.length === 0 ||
        (filters.tagMode === "all"
          ? filters.tagIds.every((id) => assigned.has(id))
          : filters.tagIds.some((id) => assigned.has(id)));
      return matchesSearch && matchesInlineTag && matchesRank && matchesPercentage &&
        matchesMedia && matchesVerification && matchesPrediction && matchesTags;
    });
  }, [levels, search, selectedTag, levelTags, filters, isFutureList]);

  // ==========================================================
  // CHANGE LIST
  // ==========================================================

  function changeList(slug: string) {
    setActiveList(slug);
    setOpenDropdown(null);
    setSearch("");
    setSelectedTag(null);
    setFilters({ ...EMPTY_FILTERS });
    setFiltersOpen(false);
    setHistoryOpen(false);
    setTooltip(null);
  }

  const listLabel =
    activeList === "demon"
      ? "DEMON LIST"
      : activeList === "future-demon"
      ? "FUTURE DEMON LIST"
      : activeList === "challenge"
      ? "CHALLENGE LIST"
      : "IMPOSSIBLE LIST";

  const navigationSlugs = [
    "demon",
    "challenge",
    "impossible",
    "future-demon",
  ];

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main
      className="min-h-screen bg-[#101014] text-white"
      onClick={() =>
        setOpenDropdown(null)
      }
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="relative z-40 border-b border-white/10 bg-[#17171b] px-4 py-3 lg:px-7">
        <div className="mx-auto flex max-w-[1900px] flex-wrap items-center gap-3 lg:gap-6">
          <h1 className="mr-2 text-3xl font-black tracking-tight text-orange-500">ihPS</h1>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Main navigation">
            {navigationSlugs.map((slug) => {
              const list = lists.find((item) => item.slug === slug);
              if (!list) return null;
              const isActive = activeList === slug;
              return <button key={list.id} type="button" onClick={() => changeList(slug)}
                className={`rounded-lg px-3 py-2.5 text-xs font-extrabold transition sm:px-4 sm:text-sm ${isActive ? "bg-orange-500 text-white" : "bg-[#29292f] text-gray-400 hover:text-white"}`}>
                {slug === "demon" ? "DEMON LIST" : slug === "challenge" ? "CHALLENGE LIST" : slug === "impossible" ? "IMPOSSIBLE LIST" : "FUTURE DEMON LIST"}
              </button>;
            })}
            <Link href="/leaderboards" className="rounded-lg bg-[#29292f] px-3 py-2.5 text-xs font-extrabold text-gray-300 hover:text-white sm:px-4 sm:text-sm">LEADERBOARDS</Link>
            <Link href="/submit" className="rounded-lg bg-[#29292f] px-3 py-2.5 text-xs font-extrabold text-gray-300 hover:text-white sm:px-4 sm:text-sm">SUBMIT A RECORD</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
            <a href="https://discord.gg/726ESqR3KZ" target="_blank" rel="noopener noreferrer" title="Join ihPS Discord" aria-label="Join ihPS Discord" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600">
              <svg className="h-6 w-6" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true"><path d="M104.4 8.54a102.6 102.6 0 0 0-25.4-7.9 71.9 71.9 0 0 0-3.25 6.7 95.5 95.5 0 0 0-28.6 0 71.8 71.8 0 0 0-3.3-6.7 102.7 102.7 0 0 0-25.4 7.9C2.4 32.5-1.9 55.8.3 78.8a103.2 103.2 0 0 0 31.2 15.7 76.2 76.2 0 0 0 6.7-10.9 66.8 66.8 0 0 1-10.5-5.1c.9-.6 1.7-1.3 2.5-1.9a73.2 73.2 0 0 0 66.8 0c.8.6 1.6 1.3 2.5 1.9a66.9 66.9 0 0 1-10.5 5.1 76 76 0 0 0 6.7 10.9 103 103 0 0 0 31.2-15.7c2.7-26.7-4.6-49.8-22.5-70.3ZM42.5 65.3c-6.1 0-11.1-5.6-11.1-12.4s4.9-12.4 11.1-12.4c6.2 0 11.2 5.6 11.1 12.4 0 6.8-4.9 12.4-11.1 12.4Zm42.1 0c-6.1 0-11.1-5.6-11.1-12.4s4.9-12.4 11.1-12.4c6.2 0 11.2 5.6 11.1 12.4 0 6.8-4.9 12.4-11.1 12.4Z"/></svg>
            </a>
            <NotificationBell />
            <AccountHeader />
          </div>
        </div>
      </header>

      {/* ======================================================
          DATABASE ERRORS
      ====================================================== */}

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-950/50 p-4 text-red-300">
          Database error: {error}
        </div>
      )}

      {tagsError && (
        <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-950/50 p-4 text-red-300">
          {tagsError}. Check SELECT permissions/RLS on public.tags and public.level_tags.
        </div>
      )}

      {pointsError && !isFutureList && (
        <div className="mx-4 mt-4 rounded-lg border border-orange-500/30 bg-orange-950/30 p-4 text-orange-300">
          Unable to load list points: {pointsError}
        </div>
      )}

      {/* ======================================================
          THREE-COLUMN LAYOUT
      ====================================================== */}

      <div className="relative isolate overflow-hidden">
        {/* Shared level artwork behind all three columns */}
        {thumbnail && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-75 blur-[2px]"
            style={{ backgroundImage: `url("${thumbnail}")` }}
          />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[#101014]/15"
        />

        <div className="relative z-10 grid gap-2.5 px-4 py-4 lg:grid-cols-[420px_minmax(0,1fr)_350px]">

        {/* ====================================================
            LEFT SIDEBAR
        ==================================================== */}

        <aside className="min-w-0 rounded-xl border border-white/25 bg-[#1b1b20]/45 p-3 backdrop-blur-[2px]">
          <h2 className="mb-4 text-center text-xl font-bold">
            {listLabel}
          </h2>

          <div className="mb-3 flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search levels..."
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101014] p-3 text-sm outline-none focus:border-orange-500"
            />
            <button type="button" onClick={openFilters}
              className={`shrink-0 rounded-lg border px-3 text-sm font-semibold transition ${activeFilterCount ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-white/20 bg-[#242429] text-gray-200 hover:border-orange-500"}`}>
              ⚙ Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          {selectedTag && (
            <button
              type="button"
              onClick={() =>
                setSelectedTag(null)
              }
              className="mb-3 w-full rounded-lg border border-orange-500/40 bg-orange-500/10 p-2 text-xs text-orange-400"
            >
              Clear tag filter ×
            </button>
          )}

          <div className="max-h-[78vh] space-y-1.5 overflow-y-auto pr-1">

            {filteredLevels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => {
                  setSelectedId(level.id);
                  setHistoryOpen(false);
                  setTooltip(null);
                }}
                className={`flex w-full items-center gap-4 rounded-md px-5 py-2.5 text-left transition ${
                  selectedId === level.id
                    ? "bg-orange-500 text-white"
                    : "bg-[#242429] text-gray-200 hover:bg-[#34343b]"
                }`}
              >
                <span className="w-12 shrink-0 text-center text-base font-extrabold">
                  #{level.position}
                </span>

                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                  {level.name}
                </span>
              </button>
            ))}

            {loading && (
              <p className="p-4 text-center text-gray-400">
                Loading...
              </p>
            )}

            {!loading &&
              filteredLevels.length === 0 && (
                <p className="p-4 text-center text-gray-400">
                  No levels found.
                </p>
              )}
          </div>
        </aside>

        {/* ====================================================
            MIDDLE: LEVEL VIEWER
        ==================================================== */}

        <section className="relative min-w-0 overflow-hidden rounded-xl border border-white/25 bg-[#1b1b20]/50 backdrop-blur-[2px]">

          <div className="relative z-10 p-4">

            {selectedLevel ? (
              <>

                {/* LEVEL TITLE */}

                <h2 className="border-b border-white/30 pb-2 text-[34px] font-extrabold leading-tight tracking-tight">
                  {selectedLevel.name}
                </h2>

                {/* DESCRIPTION */}

                <p className="my-3 text-[17px] font-semibold leading-[1.5] text-gray-200">
                  {selectedLevel.description ||
                    "No description available."}
                </p>

                {/* ============================================
                    MEDIA VIEWER

                    1. YouTube video
                    2. Uploaded image
                    3. Placeholder
                ============================================ */}

                {embedUrl ? (

                  // YOUTUBE VIDEO

                  <div className="aspect-video w-full max-w-[760px] overflow-hidden rounded-xl bg-black">
                    <iframe
                      key={`${selectedLevel.id}-${videoId}`}
                      src={embedUrl}
                      title={`${selectedLevel.name} video`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>

                ) : uploadedImage ? (

                  // UPLOADED IMAGE

                  <div className="flex aspect-video w-full max-w-[760px] items-center justify-center overflow-hidden rounded-xl bg-black">
                    <img
                      key={`${selectedLevel.id}-${uploadedImage}`}
                      src={uploadedImage}
                      alt={`${selectedLevel.name} preview`}
                      className="h-full w-full object-contain"
                    />
                  </div>

                ) : (

                  // NO MEDIA

                  <div className="flex aspect-video w-full max-w-[760px] items-center justify-center rounded-xl bg-black/60 text-gray-400">
                    No video or image available.
                  </div>

                )}

                {/* ============================================
                    LEVEL TAGS
                ============================================ */}

                {currentTags.length > 0 && (
                  <div className="mt-3 flex max-w-[760px] flex-wrap gap-1.5">
                    {currentTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setSelectedTag(
                            selectedTag === tag.id
                              ? null
                              : tag.id
                          )
                        }
                        onMouseEnter={(event) =>
                          setTooltip({
                            text:
                              tag.description ??
                              tag.name,
                            x: event.clientX,
                            y: event.clientY,
                          })
                        }
                        onMouseMove={(event) =>
                          setTooltip({
                            text:
                              tag.description ??
                              tag.name,
                            x: event.clientX,
                            y: event.clientY,
                          })
                        }
                        onMouseLeave={() =>
                          setTooltip(null)
                        }
                        className={`rounded-md border px-2 py-1 text-sm transition ${
                          selectedTag === tag.id
                            ? "border-orange-500 bg-orange-500/20 text-orange-300"
                            : "border-gray-500 bg-[#222227]/80 hover:border-orange-500"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* ============================================
                    SIX STATISTICS
                ============================================ */}

                <div className={`mt-5 grid gap-y-4 ${isFutureList || activeList === "challenge" ? "grid-cols-2" : "grid-cols-3"}`}>

                  {/* LEVEL ID */}

                  <Stat
                    title="LEVEL ID"
                    value={
                      selectedLevel.gd_level_id == null
                        ? "—"
                        : String(
                            selectedLevel.gd_level_id
                          )
                    }
                  />

                  {/* POINTS OR PREDICTION */}

                  <Stat
                    title={
                      isFutureList
                        ? "PREDICTED PLACEMENT"
                        : isImpossibleList
                        ? "SONG"
                        : "LIST POINTS"
                    }
                    value={
                      isFutureList
                        ? selectedLevel.predicted_position ==
                          null
                          ? "—"
                          : `#${selectedLevel.predicted_position}`
                        : isImpossibleList
                        ? selectedLevel.song_name || "—"
                        : pointsLoading
                        ? "..."
                        : formatPoints(selectedPoints)
                    }
                  />

                  {/* LIST PERCENTAGE OR CPS; SONG ON FUTURE LIST */}

                  <Stat
                    title={
                      isFutureList
                        ? "SONG"
                        : isImpossibleList
                        ? "CPS"
                        : activeList === "challenge"
                        ? "SONG"
                        : "LIST PERCENTAGE"
                    }
                    value={
                      isFutureList
                        ? selectedLevel.song_name || "—"
                        : activeList === "challenge"
                        ? selectedLevel.song_name || "—"
                        : isImpossibleList
                        ? selectedLevel.cps == null
                          ? "—"
                          : String(selectedLevel.cps)
                        : percentage == null
                        ? "—"
                        : `${percentage}%`
                    }
                  />

                  {/* FUTURE RANK OR SONG */}

                  <Stat
                    title={
                      isFutureList
                        ? "FUTURE LIST RANK"
                        : isImpossibleList
                        ? "WR USER"
                        : activeList === "challenge"
                        ? "LENGTH"
                        : "SONG"
                    }
                    value={
                      isFutureList
                        ? `#${selectedLevel.position}`
                        : isImpossibleList
                        ? selectedLevel.wr_user || "—"
                        : activeList === "challenge"
                        ? selectedLevel.level_length || "—"
                        : selectedLevel.song_name || "—"
                    }
                  />

                  {/* PARTIAL POINTS OR POSSIBILITY (NOT ON FUTURE LIST) */}

                  {!isFutureList && activeList !== "challenge" && <Stat
                    title={
                      isImpossibleList
                        ? "WR %"
                        : "PARTIAL POINTS"
                    }
                    value={
                      isImpossibleList
                        ? selectedLevel.wr_percent == null
                          ? "—"
                          : `${selectedLevel.wr_percent}%`
                        : pointsLoading
                        ? "..."
                        : formatPoints(partial)
                    }
                  />}

                  {/* DIFFICULTY (NOT ON FUTURE LIST) */}

                  {!isFutureList && activeList !== "challenge" && <Stat
                    title={isImpossibleList || currentList?.slug === "demon" ? "LENGTH" : "DIFFICULTY"}
                    value={isImpossibleList || currentList?.slug === "demon"
                      ? selectedLevel.level_length || "—"
                      : selectedLevel.difficulty_class ?? "—"}
                  />}

                </div>

                {/* ============================================
                    CREATOR DETAILS
                ============================================ */}

                <div className="mt-6 space-y-3 text-sm">

                  <DetailRow
                    label="PUBLISHER"
                    value={selectedLevel.publisher || "—"}
                  />

                  {!isImpossibleList && !isFutureList && <DetailRow
                    label="VERIFIER"
                    value={
                      selectedLevel.verifier || "—"
                    }
                  />}

                  <DetailRow
                    label="CREATORS"
                    value={
                      selectedLevel.creator || "—"
                    }
                  />

                </div>

                {/* ============================================
                    POSITION HISTORY
                ============================================ */}

                <div className="mt-7">

                  <button
                    type="button"
                    onClick={() =>
                      setHistoryOpen(!historyOpen)
                    }
                    className="flex items-center gap-3 text-2xl font-bold hover:text-orange-400"
                  >
                    Position History

                    <span className="text-lg text-orange-500">
                      {historyOpen ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {historyOpen && (
                    <div className="mt-4 rounded-lg bg-black/20 p-4">

                      {history.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          No position history available.
                        </p>
                      ) : (
                        <div className="space-y-3">

                          {history.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex flex-wrap justify-between gap-2 border-b border-white/10 pb-2 text-sm"
                            >
                              <span>
                                {entry.old_position == null
                                  ? "Unranked"
                                  : `#${entry.old_position}`}

                                {" → "}

                                {entry.new_position == null
                                  ? "Unranked"
                                  : `#${entry.new_position}`}
                              </span>

                              <span className="text-gray-400">
                                {new Date(
                                  entry.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ))}

                        </div>
                      )}

                    </div>
                  )}

                </div>

              </>
            ) : (
              <div className="flex min-h-[400px] items-center justify-center text-gray-400">
                {loading
                  ? "Loading level..."
                  : "Select a level."}
              </div>
            )}

          </div>
        </section>

        {/* ====================================================
            RIGHT SIDEBAR: RECORDS
        ==================================================== */}

        <aside className="min-w-0 rounded-xl border border-white/25 bg-[#1b1b20]/45 p-4 backdrop-blur-[2px]">
          <LevelRecords levelId={selectedLevel?.id ?? null} />
        </aside>

        </div> {/* End three-column grid */}
      </div> {/* End shared background wrapper */}

      {/* FILTER SETTINGS MODAL */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="List Search Settings"
            className="flex max-h-[90vh] w-full max-w-[1050px] flex-col rounded-xl border border-white/15 bg-[#1e1e23] p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">List Search Settings</h2>
                <p className="mt-1 text-sm text-gray-400">Filter levels without changing their official ranks.</p>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)} className="text-2xl text-gray-400 hover:text-white" aria-label="Close">×</button>
            </div>
            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto md:grid-cols-[1fr_1.2fr]">
              <div>
                <h3 className="mb-3 text-lg font-bold">Filters</h3>
                <div className="space-y-5 rounded-xl bg-[#17171b] p-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Rank Range</p>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {[["All", ""], ["Top 10", "10"], ["Top 25", "25"], ["Top 50", "50"]].map(([label, maximum]) => (
                        <button key={label} type="button" onClick={() => setDraftFilters((previous) => ({ ...previous, rankMin: "", rankMax: maximum }))}
                          className={`rounded-md border px-2 py-1 text-xs ${draftFilters.rankMin === "" && draftFilters.rankMax === maximum ? "border-orange-500 text-orange-400" : "border-white/20 text-gray-300"}`}>{label}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input aria-label="Minimum rank" type="number" min="1" placeholder="Min rank" value={draftFilters.rankMin} onChange={(e) => updateDraft("rankMin", e.target.value)} className="w-1/2 rounded-md bg-[#101014] p-2 text-sm" />
                      <input aria-label="Maximum rank" type="number" min="1" placeholder="Max rank" value={draftFilters.rankMax} onChange={(e) => updateDraft("rankMax", e.target.value)} className="w-1/2 rounded-md bg-[#101014] p-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">List Percentage</p>
                    <div className="flex gap-2">
                      <input aria-label="Minimum list percentage" type="number" min="1" max="99" placeholder="Min %" value={draftFilters.percentageMin} onChange={(e) => updateDraft("percentageMin", e.target.value)} className="w-1/2 rounded-md bg-[#101014] p-2 text-sm" />
                      <input aria-label="Maximum list percentage" type="number" min="1" max="99" placeholder="Max %" value={draftFilters.percentageMax} onChange={(e) => updateDraft("percentageMax", e.target.value)} className="w-1/2 rounded-md bg-[#101014] p-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="media-filter">Media</label>
                    <select id="media-filter" value={draftFilters.media} onChange={(e) => updateDraft("media", e.target.value as FilterSettings["media"])} className="w-full rounded-md bg-[#101014] p-2 text-sm">
                      <option value="all">All Media</option><option value="youtube">Has YouTube Video</option><option value="image">Has Uploaded Image</option><option value="none">No Media</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold" htmlFor="verification-filter">Verification</label>
                    <select id="verification-filter" value={draftFilters.verification} onChange={(e) => updateDraft("verification", e.target.value as FilterSettings["verification"])} className="w-full rounded-md bg-[#101014] p-2 text-sm">
                      <option value="all">All Levels</option><option value="verified">Has Verifier</option><option value="unverified">No Verifier</option>
                    </select>
                  </div>
                  {isFutureList && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Predicted Demon List Placement</p>
                      <div className="flex gap-2">
                        <input aria-label="Minimum predicted placement" type="number" min="1" placeholder="Min #" value={draftFilters.predictionMin} onChange={(e) => updateDraft("predictionMin", e.target.value)} className="w-1/2 rounded-md bg-[#101014] p-2 text-sm" />
                        <input aria-label="Maximum predicted placement" type="number" min="1" placeholder="Max #" value={draftFilters.predictionMax} onChange={(e) => updateDraft("predictionMax", e.target.value)} className="w-1/2 rounded-md bg-[#101014] p-2 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex min-h-0 flex-col">
                <h3 className="mb-3 text-lg font-bold">Tags</h3>
                <input value={filterTagSearch} onChange={(e) => setFilterTagSearch(e.target.value)} placeholder="Search tags..." className="mb-3 rounded-lg border border-white/15 bg-[#101014] p-2.5 text-sm" />
                <div className="min-h-[180px] flex-1 space-y-4 overflow-y-auto rounded-xl bg-[#17171b] p-4 md:max-h-[380px]">
                  {Object.keys(FILTER_TAG_GROUPS).concat("OTHER TAGS").filter((group) => isImpossibleList || group !== "ILL EXCLUSIVE").map((group) => {
                    const groupTags = tags.filter((tag) => tagGroup(tag.name) === group && tag.name.toLowerCase().includes(filterTagSearch.toLowerCase()));
                    if (!groupTags.length) return null;
                    return (
                      <div key={group}>
                        <h4 className="mb-2 text-xs font-bold tracking-wider text-orange-400">{group}</h4>
                        <div className="flex flex-wrap gap-2">
                          {groupTags.map((tag) => {
                            const chosen = draftFilters.tagIds.includes(tag.id);
                            return (
                              <button type="button" key={tag.id} title={tag.description ?? tag.name}
                                onClick={() => updateDraft("tagIds", chosen ? draftFilters.tagIds.filter((id) => id !== tag.id) : [...draftFilters.tagIds, tag.id])}
                                className={`rounded-md border px-2 py-1.5 text-xs transition ${chosen ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-white/15 bg-[#242429] text-gray-300 hover:border-orange-500/50"}`}>
                                {chosen ? "✓ " : ""}{tag.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-semibold">Tag matching:</span>
                  <label className="flex items-center gap-2"><input type="radio" name="tag-match" checked={draftFilters.tagMode === "all"} onChange={() => updateDraft("tagMode", "all")} className="accent-orange-500" /> Match ALL</label>
                  <label className="flex items-center gap-2"><input type="radio" name="tag-match" checked={draftFilters.tagMode === "any"} onChange={() => updateDraft("tagMode", "any")} className="accent-orange-500" /> Match ANY</label>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
              <button type="button" onClick={() => { setDraftFilters({ ...EMPTY_FILTERS }); setFilters({ ...EMPTY_FILTERS }); setFiltersOpen(false); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold">Reset All</button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-lg bg-[#303036] px-4 py-2 text-sm font-bold">Cancel</button>
              <button type="button" onClick={() => { setFilters({ ...draftFilters, tagIds: [...draftFilters.tagIds] }); setFiltersOpen(false); }} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          FLOATING TAG TOOLTIP
      ====================================================== */}

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[9999] max-w-[360px] rounded-md border border-white/30 bg-black px-3 py-2 text-xs font-semibold leading-relaxed text-white shadow-2xl"
          style={{
            left: Math.max(
              8,
              Math.min(
                tooltip.x + 14,
                window.innerWidth - 375
              )
            ),

            top: Math.max(
              8,
              Math.min(
                tooltip.y + 18,
                window.innerHeight - 75
              )
            ),
          }}
        >
          {tooltip.text}
        </div>
      )}

    </main>
  );
}