"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type List = {
  id: string;
  slug: string;
  name: string;
};

type Level = {
  id: string;
  list_id: string;
  name: string;
  position: number;
  creator: string | null;
  publisher: string | null;
  verifier: string | null;
  gd_level_id: string | number | null;
  youtube_url: string | null;
  image_url: string | null;
  description: string | null;
  list_percentage: number | null;
  predicted_position: number | null;
  wr_user: string | null;
  wr_percent: number | null;
  song_name: string | null;
  cps: string | null;
  level_length: string | null;
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

type LevelForm = {
  name: string;
  position: string;
  creator: string;
  publisher: string;
  verifier: string;
  gd_level_id: string;
  youtube_url: string;
  image_url: string;
  description: string;
  list_percentage: string;
  predicted_position: string;
  wr_user: string;
  wr_percent: string;
  song_name: string;
  cps: string;
  level_length: string;
};

type LevelDraft = {
  listId: string;
  levelId: string;
  levelName: string;
  form: LevelForm;
  tagIds: string[];
};

type Tooltip = {
  text: string;
  x: number;
  y: number;
};

// ============================================================
// DEFAULT VALUES
// ============================================================

const EMPTY_FORM: LevelForm = {
  name: "",
  position: "",
  creator: "",
  publisher: "",
  verifier: "",
  gd_level_id: "",
  youtube_url: "",
  image_url: "",
  description: "",
  list_percentage: "",
  predicted_position: "",
  wr_user: "",
  wr_percent: "",
  song_name: "",
  cps: "",
  level_length: "",
};

const inputClass =
  "w-full rounded-lg border border-white/10 " +
  "bg-[#101014] px-4 py-3 text-sm text-white " +
  "outline-none placeholder:text-gray-600 " +
  "focus:border-orange-500 disabled:opacity-50";

const buttonClass =
  "rounded-lg px-4 py-2 text-sm font-bold transition " +
  "disabled:cursor-not-allowed disabled:opacity-40";

// ============================================================
// TAG CATEGORIES
// ============================================================

const TAG_CATEGORIES: Record<string, string[]> = {
  "GAME VERSION": [
    "2.2",
    "2.1",
    "2.0",
    "1.9",
  ],

  "LEVEL LENGTH": [
    "Medium",
    "Long",
    "XL",
    "XXL",
    "XXL+",
  ],

  "SPECIAL FEATURES": [
    "NONG",
    "2P",
    "Circles",
    "Gimmicky",
    "Learny",
    "Memory",
  ],

  "GAMEPLAY STYLE": [
    "Slow-Paced",
    "Fast-Paced",
    "Clicksync",
    "Flow",
    "Mirror",
  ],

  "DIFFICULTY CHARACTERISTICS": [
    "Nerve Control",
    "Consistency",
    "Chokepoints",
    "High CPS",
    "Timings",
    "Precision",
    "Unbalanced",
    "End-Heavy",
    "Beginning-Heavy",
    "Physically Demanding",
  ],

  GAMEMODES: [
    "Overall",
    "Cube",
    "Ship",
    "Ball",
    "UFO",
    "Wave",
    "Robot",
    "Spider",
    "Swing",
    "Old Swing",
    "Duals",
  ],

  "ILL EXCLUSIVE": [
  "Swift Clicks",
  "Alignments",
  "Macrobuffs",
  "MINUSwave",
  "30+ CPS",
  "50+ CPS",
  "100+ CPS",
  "250+ CPS",
  "500+ CPS",
  "1000+ CPS",
  "Googology",
  "Theoretically Possible",
  "Humanly Impossible",
  "Humanly Possible",
  "FPS Bypass",
  "Counter",
  "Snap",
],
};

// ============================================================
// HELPERS
// ============================================================

function categoryForTag(name: string): string {
  for (const [category, names] of Object.entries(
    TAG_CATEGORIES
  )) {
    if (names.includes(name)) {
      return category;
    }
  }

  return "OTHER TAGS";
}

function formFromLevel(level: Level): LevelForm {
  return {
    name: level.name,
    position: String(level.position),
    creator: level.creator ?? "",
    publisher: level.publisher ?? "",
    verifier: level.verifier ?? "",

    gd_level_id:
      level.gd_level_id == null
        ? ""
        : String(level.gd_level_id),

    youtube_url: level.youtube_url ?? "",
    image_url: level.image_url ?? "",
    description: level.description ?? "",

    list_percentage:
      level.list_percentage == null
        ? ""
        : String(level.list_percentage),

    predicted_position:
      level.predicted_position == null
        ? ""
        : String(level.predicted_position),

    wr_user: level.wr_user ?? "",
    wr_percent: level.wr_percent == null ? "" : String(level.wr_percent),
    song_name: level.song_name ?? "",
    cps: level.cps == null ? "" : String(level.cps),
    level_length: level.level_length ?? "",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

function moveLevel(
  levels: Level[],
  sourceId: string,
  targetId: string
): Level[] {
  const next = [...levels];

  const from = next.findIndex(
    (level) => level.id === sourceId
  );

  const to = next.findIndex(
    (level) => level.id === targetId
  );

  if (from < 0 || to < 0 || from === to) {
    return levels;
  }

  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved);

  return next.map((level, index) => ({
    ...level,
    position: index + 1,
  }));
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold tracking-wide text-orange-500">
        {label}

        {required && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

// ============================================================
// ADMIN PAGE
// ============================================================

export default function AdminPage() {
  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  const [userId, setUserId] = useState<string | null>(
    null
  );

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [canManage, setCanManage] = useState(false);

  const [
    checkingPermission,
    setCheckingPermission,
  ] = useState(false);

  // ----------------------------------------------------------
  // LISTS AND LEVELS
  // ----------------------------------------------------------

  const [lists, setLists] = useState<List[]>([]);

  const [activeListId, setActiveListId] =
    useState("");

  const [levels, setLevels] = useState<Level[]>([]);

  const [loading, setLoading] = useState(false);

  const [busy, setBusy] = useState(false);

  // ----------------------------------------------------------
  // LEVEL EDITOR
  // ----------------------------------------------------------

  const [form, setForm] = useState<LevelForm>({
    ...EMPTY_FORM,
  });

  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  // ----------------------------------------------------------
  // STAGED BULK EDITS (kept across list switches)
  // ----------------------------------------------------------

  const [drafts, setDrafts] = useState<Record<string, LevelDraft>>({});
  const [saveAllProgress, setSaveAllProgress] = useState("");
  const savingAllRef = useRef(false);

  // ----------------------------------------------------------
  // IMAGE UPLOADER
  // ----------------------------------------------------------

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  // ----------------------------------------------------------
  // TAGS
  // ----------------------------------------------------------

  const [tags, setTags] = useState<Tag[]>([]);

  const [levelTags, setLevelTags] = useState<
    LevelTag[]
  >([]);

  const [
    selectedTagIds,
    setSelectedTagIds,
  ] = useState<string[]>([]);

  const [tagSearch, setTagSearch] = useState("");

  const [selectedOnly, setSelectedOnly] =
    useState(false);

  const [tooltip, setTooltip] = useState<
    Tooltip | null
  >(null);

  // ----------------------------------------------------------
  // SEARCH / DRAGGING
  // ----------------------------------------------------------

  const [search, setSearch] = useState("");

  const [draggedId, setDraggedId] = useState<
    string | null
  >(null);

  const [dragOverId, setDragOverId] = useState<
    string | null
  >(null);

  // ----------------------------------------------------------
  // MESSAGES
  // ----------------------------------------------------------

  const [message, setMessage] = useState("");

  const [isError, setIsError] = useState(false);

  // ----------------------------------------------------------
  // DERIVED VALUES
  // ----------------------------------------------------------

  const activeList = lists.find(
    (list) => list.id === activeListId
  );

  const isFutureList =
    activeList?.slug === "future-demon";

  const isImpossibleList =
    activeList?.slug === "impossible";

  const editingLevel = levels.find(
    (level) => level.id === editingId
  );

  // ==========================================================
  // BASIC FUNCTIONS
  // ==========================================================

  function notify(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  function updateField(
    field: keyof LevelForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // Stage the current editor before closing it or opening another level.
  // Unchanged levels are not added to the pending queue.
  function stageCurrentEdit() {
    if (!editingId || !activeListId) return;
    const original = levels.find((level) => level.id === editingId);
    if (!original) return;

    const originalTags = levelTags
      .filter((entry) => entry.level_id === editingId)
      .map((entry) => entry.tag_id)
      .sort();
    const currentTags = [...selectedTagIds].sort();
    const changed =
      JSON.stringify(form) !== JSON.stringify(formFromLevel(original)) ||
      JSON.stringify(currentTags) !== JSON.stringify(originalTags);

    setDrafts((previous) => {
      const next = { ...previous };
      if (changed) {
        next[editingId] = {
          listId: activeListId,
          levelId: editingId,
          levelName: form.name.trim() || original.name,
          form: { ...form },
          tagIds: [...selectedTagIds],
        };
      } else {
        delete next[editingId];
      }
      return next;
    });
  }

  function exitEditor() {
    stageCurrentEdit();
    resetEditor();
    notify("Editor closed. Any changes are staged for SAVE ALL CHANGES.");
  }

  function switchList(nextListId: string) {
    if (busy || uploadingImage || nextListId === activeListId) return;
    stageCurrentEdit();
    setActiveListId(nextListId);
  }

  function resetEditor() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      position: String(levels.length + 1),
    });

    setSelectedTagIds([]);
    setTagSearch("");
    setSelectedOnly(false);
    setTooltip(null);
  }

  function editLevel(level: Level) {
    if (busy || uploadingImage) return;
    stageCurrentEdit();
    const staged = drafts[level.id];
    setEditingId(level.id);
    setForm(staged ? { ...staged.form } : formFromLevel(level));
    setSelectedTagIds(
      staged
        ? [...staged.tagIds]
        : levelTags
            .filter((entry) => entry.level_id === level.id)
            .map((entry) => entry.tag_id)
    );

    setTagSearch("");
    setSelectedOnly(false);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleTag(id: string) {
    const tag = tags.find((item) => item.id === id);
    if (!tag) return;

    if (!isImpossibleList && categoryForTag(tag.name) === "ILL EXCLUSIVE") {
      notify("ILL EXCLUSIVE tags can only be used on the Impossible List.", true);
      return;
    }

    setSelectedTagIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
  }

  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;

      setUserId(data.user?.id ?? null);
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
        setCheckingAuth(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Warn before closing or refreshing with staged edits.
  useEffect(() => {
    if (Object.keys(drafts).length === 0 && !editingId) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [drafts, editingId]);

  // ==========================================================
  // LOAD LISTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadLists() {
      const { data, error } = await supabase
        .from("lists")
        .select("id, slug, name")
        .order("name");

      if (cancelled) return;

      if (error) {
        notify(error.message, true);
        return;
      }

      const available = (data ?? []) as List[];

      setLists(available);

      setActiveListId(
        available.find(
          (list) => list.slug === "demon"
        )?.id ??
          available[0]?.id ??
          ""
      );
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
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, description")
        .order("name");

      if (cancelled) return;

      if (error) {
        notify(error.message, true);
        return;
      }

      setTags((data ?? []) as Tag[]);
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // CHECK LIST PERMISSIONS
  // ==========================================================

  useEffect(() => {
    if (!userId || !activeListId) {
      setCanManage(false);
      setCheckingPermission(false);
      return;
    }

    let cancelled = false;

    async function checkPermission() {
      setCheckingPermission(true);
      setCanManage(false);

      const { data, error } = await supabase.rpc(
        "can_manage_list",
        {
          target_list_id: activeListId,
        }
      );

      if (cancelled) return;

      if (error) {
        notify(error.message, true);
      } else {
        setCanManage(data === true);
      }

      setCheckingPermission(false);
    }

    void checkPermission();

    return () => {
      cancelled = true;
    };
  }, [userId, activeListId]);

  // ==========================================================
  // REFRESH LEVELS
  // ==========================================================

  const refresh = useCallback(async () => {
    if (!activeListId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("levels")
        .select(
          "id, list_id, name, position, creator, publisher, " +
            "verifier, gd_level_id, youtube_url, " +
            "image_url, description, list_percentage, " +
            "predicted_position, wr_user, wr_percent, song_name, cps, level_length"
        )
        .eq("list_id", activeListId)
        .order("position", {
          ascending: true,
        });

      if (error) {
        throw new Error(error.message);
      }

      const loaded = (data ?? []) as unknown as Level[];

      setLevels(loaded);

      if (loaded.length === 0) {
        setLevelTags([]);
      } else {
        const {
          data: assignments,
          error: tagError,
        } = await supabase
          .from("level_tags")
          .select("level_id, tag_id")
          .in(
            "level_id",
            loaded.map((level) => level.id)
          );

        if (tagError) {
          throw new Error(tagError.message);
        }

        setLevelTags(
          (assignments ?? []) as LevelTag[]
        );
      }
    } catch (error) {
      notify(errorMessage(error), true);
    } finally {
      setLoading(false);
    }
  }, [activeListId]);

  // ==========================================================
  // CHANGE ACTIVE LIST
  // ==========================================================

  useEffect(() => {
    setLevels([]);
    setLevelTags([]);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSelectedTagIds([]);
    setSearch("");
    setMessage("");
    setTooltip(null);

    if (activeListId) {
      void refresh();
    }
  }, [activeListId, refresh]);

  // ==========================================================
  // FILTER LEVELS
  // ==========================================================

  const filteredLevels = useMemo(() => {
    const query = search.trim().toLowerCase();

    return levels.filter(
      (level) =>
        level.name.toLowerCase().includes(query) ||
        (level.creator ?? "")
          .toLowerCase()
          .includes(query) ||
        String(level.position).includes(query)
    );
  }, [levels, search]);

  // ==========================================================
  // FILTER TAGS
  // ==========================================================

  const selectedTags = tags.filter((tag) =>
    selectedTagIds.includes(tag.id)
  );

  const visibleTagGroups = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();

    const visible = tags.filter((tag) => {
      const matchesSearch =
        tag.name.toLowerCase().includes(query) ||
        (tag.description ?? "")
          .toLowerCase()
          .includes(query);

      const matchesSelection =
        !selectedOnly ||
        selectedTagIds.includes(tag.id);

      const matchesList =
        !(
          !isImpossibleList &&
          categoryForTag(tag.name) === "ILL EXCLUSIVE"
        );

      return (
        matchesSearch &&
        matchesSelection &&
        matchesList
      );
    });

    const names = [
      ...Object.keys(TAG_CATEGORIES),
      "OTHER TAGS",
    ];

    return names
      .map((name) => ({
        name,
        tags: visible.filter(
          (tag) =>
            categoryForTag(tag.name) === name
        ),
      }))
      .filter((group) => group.tags.length > 0);
  }, [
    tags,
    tagSearch,
    selectedOnly,
    selectedTagIds,
    isImpossibleList,
  ]);

  // ==========================================================
  // IMAGE UPLOADER
  // ==========================================================

  async function uploadLevelImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !canManage ||
      !activeListId ||
      busy ||
      uploadingImage
    ) {
      notify(
        "You do not have permission to upload images.",
        true
      );
      event.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      notify(
        "Only PNG, JPG, WEBP, and GIF images are allowed.",
        true
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify(
        "Images must be 5 MB or smaller.",
        true
      );

      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setMessage("");

    try {
      const extension =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
          ? "webp"
          : "gif";

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      const filePath =
        `${activeListId}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("level-images")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("level-images")
        .getPublicUrl(filePath);

      setForm((previous) => ({
        ...previous,
        image_url: data.publicUrl,
      }));

      notify(
        "Image uploaded successfully! " +
          "Click SAVE LEVEL CHANGES to apply it."
      );
    } catch (error) {
      notify(
        "Image upload failed: " +
          errorMessage(error),
        true
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  // ==========================================================
  // SAVE LEVEL
  // ==========================================================

  // This is shared by Save Level and Save All. It uses the draft's
  // OWN list ID and form, never whichever level happens to be open.
  async function persistLevelDraft(draft: LevelDraft): Promise<void> {
    const { form: values, listId, levelId, tagIds } = draft;
    const targetList = lists.find((list) => list.id === listId);
    if (!targetList) throw new Error("List not found for " + draft.levelName);
    const impossible = targetList.slug === "impossible";
    const future = targetList.slug === "future-demon";

    const { data: permitted, error: permissionError } = await supabase.rpc(
      "can_manage_list", { target_list_id: listId }
    );
    if (permissionError) throw new Error(permissionError.message);
    if (permitted !== true) {
      throw new Error("You do not have permission to edit " + targetList.name);
    }

    const name = values.name.trim();
    const creator = values.creator.trim();
    const position = Number(values.position);
    if (!name || !creator) throw new Error("Level name and creators are required.");
    if (!Number.isSafeInteger(position) || position < 1) {
      throw new Error("Ranking position must be a positive whole number.");
    }

    const rawId = values.gd_level_id.trim();
    if (rawId && rawId.toLowerCase() !== "n/a" && !/^\d+$/.test(rawId)) {
      throw new Error("GD Level ID must be numeric, N/A, or blank.");
    }

    const percentText = (impossible || future || targetList.slug === "challenge") ? "" : values.list_percentage.trim();
    const percentage = percentText === "" ? null : Number(percentText);
    if (percentage !== null && (
      !Number.isSafeInteger(percentage) || percentage < 1 || percentage > 99
    )) throw new Error("List Percentage must be between 1 and 99.");

    const predictionText = values.predicted_position.trim();
    const predictedPosition = predictionText === "" ? null : Number(predictionText);
    if (future && predictedPosition !== null && (
      !Number.isSafeInteger(predictedPosition) || predictedPosition < 1
    )) throw new Error("Predicted placement must be a positive whole number.");

    if (values.youtube_url.trim()) {
      try {
        const url = new URL(values.youtube_url.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
      } catch { throw new Error("Enter a valid video URL."); }
    }

    if (!impossible && tags.some((tag) =>
      tagIds.includes(tag.id) && categoryForTag(tag.name) === "ILL EXCLUSIVE"
    )) throw new Error("Impossible-exclusive tags cannot be used on this list.");

    const wrUser = values.wr_user.trim();
    const wrText = values.wr_percent.trim();
    const wrPercent = wrText === "" ? null : Number(wrText);
    if (impossible) {
      if ((wrUser === "") !== (wrText === "")) {
        throw new Error("Enter both WR User and WR %, or leave both blank.");
      }
      if (wrPercent !== null && (
        !Number.isFinite(wrPercent) || wrPercent < 0 || wrPercent > 100
      )) throw new Error("WR % must be between 0 and 100.");
    }

    const { error: saveError } = await supabase.rpc("admin_save_level", {
      p_list_id: listId,
      p_level_id: levelId || null,
      p_position: position,
      p_data: {
        name,
        creator,
        verifier: impossible || future ? "" : values.verifier.trim(),
        gd_level_id: /^\d+$/.test(rawId) ? rawId : null,
        youtube_url: values.youtube_url.trim(),
        description: values.description.trim(),
      },
    });
    if (saveError) throw new Error("Level: " + saveError.message);

    let savedId = levelId;
    if (!savedId) {
      const { data, error } = await supabase.from("levels")
        .select("id")
        .eq("list_id", listId)
        .eq("name", name)
        .eq("position", position)
        .limit(2);
      if (error) throw new Error(error.message);
      if (!data || data.length !== 1) {
        throw new Error("Level created, but its ID could not be identified uniquely. Refresh to finish saving extra settings.");
      }
      savedId = data[0].id;
    }

    const { error: publisherError } = await supabase.rpc(
      "admin_set_level_publisher", {
        target_level_id: savedId,
        chosen_publisher: values.publisher.trim(),
      }
    );
    if (publisherError) throw new Error("Publisher: " + publisherError.message);

    // ILL: CPS and length. Demon: length only. Other lists unchanged.
    if (impossible || targetList.slug === "demon" || targetList.slug === "challenge") {
      const rawCps = values.cps.trim();
      if (impossible && rawCps.length > 120) {
        throw new Error("CPS text must be 120 characters or fewer.");
      }
      const { error: metricsError } = await supabase.rpc("admin_set_level_metrics", {
        target_level_id: savedId,
        chosen_cps: impossible ? rawCps : null,
        chosen_length: values.level_length.trim(),
      });
      if (metricsError) throw new Error("CPS / Length: " + metricsError.message);
    }

    // Song is available on ALL four lists, including Impossible and Future.
    const { error: songError } = await supabase.rpc("admin_set_level_song", {
      target_level_id: savedId,
      chosen_song_name: values.song_name.trim(),
    });
    if (songError) throw new Error("Song: " + songError.message);

    if (impossible) {
      const { error: wrError } = await supabase.rpc("admin_set_impossible_wr", {
        target_level_id: savedId,
        chosen_wr_user: wrUser,
        chosen_wr_percent: wrPercent,
      });
      if (wrError) throw new Error("World Record: " + wrError.message);
    }

    const { error: imageError } = await supabase.rpc("admin_set_level_image", {
      target_level_id: savedId,
      chosen_image_url: values.image_url.trim(),
    });
    if (imageError) throw new Error("Level Image: " + imageError.message);

    const { error: percentageError } = await supabase.rpc(
      "admin_set_list_percentage", {
        target_level_id: savedId,
        chosen_percentage: (impossible || future || targetList.slug === "challenge") ? null : percentage,
      }
    );
    if (percentageError) throw new Error("List Percentage: " + percentageError.message);

    if (future) {
      const { error: predictionError } = await supabase.rpc(
        "admin_set_predicted_position", {
          target_level_id: savedId,
          chosen_position: predictedPosition,
        }
      );
      if (predictionError) throw new Error("Predicted Placement: " + predictionError.message);
    }

    const { error: tagError } = await supabase.rpc("admin_set_level_tags", {
      target_level_id: savedId,
      selected_tag_ids: tagIds,
    });
    if (tagError) throw new Error("Level Tags: " + tagError.message);
  }

  async function saveLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy || uploadingImage || !activeListId) return;
    const draft: LevelDraft = {
      listId: activeListId,
      levelId: editingId ?? "",
      levelName: form.name.trim() || "New level",
      form: { ...form },
      tagIds: [...selectedTagIds],
    };
    setBusy(true);
    setMessage("");
    try {
      await persistLevelDraft(draft);
      if (editingId) {
        setDrafts((previous) => {
          const next = { ...previous };
          delete next[editingId];
          return next;
        });
      }
      resetEditor();
      await refresh();
      notify(`${draft.levelName} saved successfully!`);
    } catch (error) {
      notify("Save failed: " + errorMessage(error), true);
      // Keep the current editor and staged drafts for a retry.
    } finally {
      setBusy(false);
    }
  }

  async function saveAllChanges() {
    if (busy || uploadingImage || savingAllRef.current) return;
    const queued = { ...drafts };
    if (editingId && activeListId) {
      const original = levels.find((level) => level.id === editingId);
      if (original) {
        const originalTags = levelTags
          .filter((entry) => entry.level_id === editingId)
          .map((entry) => entry.tag_id).sort();
        const currentTags = [...selectedTagIds].sort();
        const changed = JSON.stringify(form) !== JSON.stringify(formFromLevel(original)) ||
          JSON.stringify(currentTags) !== JSON.stringify(originalTags);
        if (changed) {
          queued[editingId] = {
            listId: activeListId,
            levelId: editingId,
            levelName: form.name.trim() || original.name,
            form: { ...form },
            tagIds: [...selectedTagIds],
          };
        } else {
          delete queued[editingId];
        }
      }
    }
    const entries = Object.values(queued);
    if (entries.length === 0) {
      notify("No pending changes to save.");
      return;
    }

    savingAllRef.current = true;
    setBusy(true);
    setDrafts(queued);
    setMessage("");
    let completed = 0;
    try {
      for (const draft of entries) {
        setSaveAllProgress(`Saving ${completed + 1}/${entries.length}: ${draft.levelName}`);
        try {
          await persistLevelDraft(draft);
        } catch (error) {
          throw new Error(`${draft.levelName}: ${errorMessage(error)}`);
        }
        completed++;
        setDrafts((previous) => {
          const next = { ...previous };
          delete next[draft.levelId];
          return next;
        });
      }
      resetEditor();
      notify(`Saved all ${completed} level${completed === 1 ? "" : "s"} successfully!`);
    } catch (error) {
      // Completed entries stay saved; failed and remaining drafts are retained.
      notify(`Saved ${completed}/${entries.length}. Stopped: ${errorMessage(error)}. Remaining drafts are kept.`, true);
    } finally {
      setSaveAllProgress("");
      await refresh();
      setBusy(false);
      savingAllRef.current = false;
    }
  }

  // ==========================================================
  // DELETE LEVEL
  // ==========================================================

  async function deleteLevel(level: Level) {
    if (!canManage || busy) return;

    if (drafts[level.id] && !window.confirm(
      `"${level.name}" has a staged edit. Deleting it will discard that draft. Continue?`
    )) return;

    if (
      !window.confirm(
        `Delete "${level.name}"?\n\n` +
          "The remaining levels will be reordered."
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase.rpc(
          "admin_delete_level",
          {
            p_level_id: level.id,
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (editingId === level.id) {
        resetEditor();
      }
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[level.id];
        return next;
      });

      await refresh();

      notify(
        `${level.name} deleted.`
      );
    } catch (error) {
      notify(
        errorMessage(error),
        true
      );
    } finally {
      setBusy(false);
    }
  }

  // ==========================================================
  // DRAG AND DROP
  // ==========================================================

  function onDragStart(
    event: DragEvent<HTMLDivElement>,
    id: string
  ) {
    if (
      !canManage ||
      busy ||
      search.trim() ||
      Object.keys(drafts).length > 0 ||
      editingId !== null
    ) {
      event.preventDefault();
      return;
    }

    setDraggedId(id);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      id
    );
  }

  async function onDrop(
    event: DragEvent<HTMLDivElement>,
    targetId: string
  ) {
    event.preventDefault();

    const sourceId =
      draggedId ||
      event.dataTransfer.getData(
        "text/plain"
      );

    setDraggedId(null);
    setDragOverId(null);

    if (
      !sourceId ||
      sourceId === targetId ||
      !canManage ||
      busy ||
      search.trim() ||
      Object.keys(drafts).length > 0 ||
      editingId !== null
    ) {
      return;
    }

    const reordered = moveLevel(
      levels,
      sourceId,
      targetId
    );

    if (reordered === levels) {
      return;
    }

    const previous = levels;

    setLevels(reordered);
    setBusy(true);

    try {
      const { error } =
        await supabase.rpc(
          "admin_reorder_levels",
          {
            p_list_id:
              activeListId,

            p_ordered_ids:
              reordered.map(
                (level) => level.id
              ),
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await refresh();

      notify(
        "Rankings updated successfully."
      );
    } catch (error) {
      setLevels(previous);

      notify(
        errorMessage(error),
        true
      );

      await refresh();
    } finally {
      setBusy(false);
    }
  }

  // ==========================================================
  // AUTHENTICATION SCREENS
  // ==========================================================

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101014] text-white">
        Checking authentication...
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101014] p-6 text-white">
        <div className="rounded-xl border border-white/10 bg-[#1b1b20] p-8 text-center">
          <h1 className="text-3xl font-black text-orange-500">
            ihPS ADMIN
          </h1>

          <p className="mt-4 text-gray-400">
            Sign in to manage the lists.
          </p>

          <a
            href="/login"
            className="mt-6 inline-block rounded-lg bg-orange-500 px-6 py-3 font-bold"
          >
            SIGN IN
          </a>
        </div>
      </main>
    );
  }

  // ==========================================================
  // MAIN ADMIN INTERFACE
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#101014] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-[1500px]">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] text-orange-500">
              ihPS
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Administration Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage rankings, images, predicted
              placements, list percentages, and tags.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/"
              className={`${buttonClass} bg-[#29292f] hover:bg-[#393940]`}
            >
              VIEW WEBSITE
            </a>

            <button
              type="button"
              onClick={() =>
                void supabase.auth.signOut()
              }
              className={`${buttonClass} bg-red-500/10 text-red-400`}
            >
              SIGN OUT
            </button>
          </div>
        </header>

        {/* ====================================================
            LIST SELECTOR
        ==================================================== */}

        <section className="mb-5 rounded-xl border border-white/10 bg-[#1b1b20] p-4">
          <p className="mb-3 text-xs font-bold tracking-widest text-orange-500">
            SELECT LIST
          </p>

          <div className="flex flex-wrap gap-2">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => switchList(list.id)}
                className={`${buttonClass} ${
                  activeListId === list.id
                    ? "bg-orange-500 text-white"
                    : "bg-[#29292f] text-gray-400 hover:text-white"
                }`}
              >
                {list.name}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm">
            {checkingPermission ? (
              <span className="text-gray-400">
                Checking permissions...
              </span>
            ) : canManage ? (
              <span className="font-semibold text-green-400">
                ✓ You can manage this list.
              </span>
            ) : (
              <span className="font-semibold text-red-400">
                You cannot edit this list.
              </span>
            )}
          </p>
        </section>

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        {message && (
          <div
            className={`mb-5 rounded-xl border px-5 py-4 text-sm ${
              isError
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* ====================================================
            TWO-COLUMN LAYOUT
        ==================================================== */}

        <div className="grid items-start gap-5 xl:grid-cols-2">

          {/* ==================================================
              LEFT: LEVEL EDITOR
          ================================================== */}

          <section className="min-w-0 rounded-xl border border-white/10 bg-[#1b1b20] p-5">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-orange-500">
                  LEVEL EDITOR
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {editingId
                    ? "Edit Level"
                    : "Add Level"}
                </h2>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={exitEditor}
                  className={`${buttonClass} bg-[#29292f]`}
                >
                  EXIT EDITOR
                </button>
              )}
            </div>

            {editingLevel && (
              <div className="mb-5 rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                <p className="text-xs font-bold text-orange-400">
                  CURRENTLY EDITING
                </p>

                <p className="mt-1 text-lg font-bold">
                  #{editingLevel.position}{" "}
                  {editingLevel.name}
                </p>
              </div>
            )}

            <form
              onSubmit={saveLevel}
              className="space-y-5"
            >

              {/* ==============================================
                  LEVEL NAME
              ============================================== */}

              <Field
                label="LEVEL NAME"
                required
              >
                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="PULVERIZE"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  RANKING POSITION
              ============================================== */}

              <Field
                label={
                  isFutureList
                    ? "FUTURE LIST RANK"
                    : "RANKING POSITION"
                }
                required
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.position}
                  onChange={(event) =>
                    updateField(
                      "position",
                      event.target.value
                    )
                  }
                  placeholder="1"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  FUTURE DEMON LIST PREDICTION
              ============================================== */}

              {isFutureList && (
                <div className="rounded-xl border border-purple-500/30 bg-[#141419] p-5">

                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold tracking-widest text-purple-400">
                        FUTURE DEMON LIST
                      </p>

                      <h3 className="mt-1 text-xl font-black">
                        Predicted Demon List Placement
                      </h3>
                    </div>

                    <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black text-purple-300">
                      PREDICTION
                    </span>
                  </div>

                  <p className="mb-4 text-xs leading-relaxed text-gray-400">
                    Choose where this level is expected
                    to place on the real Demon List
                    after verification. This does not
                    affect its Future List ranking.
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-purple-400">
                      #
                    </span>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.predicted_position}
                      onChange={(event) =>
                        updateField(
                          "predicted_position",
                          event.target.value
                        )
                      }
                      placeholder="1"
                      className={`${inputClass} max-w-[180px] text-lg font-bold`}
                      disabled={!canManage || busy}
                    />
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    Example: Future List #2,
                    predicted Demon List #1.
                  </p>
                </div>
              )}

              <Field label="PUBLISHER">
                <input
                  value={form.publisher}
                  onChange={(event) => updateField("publisher", event.target.value)}
                  placeholder="Publisher username"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  CREATOR
              ============================================== */}

              <Field
                label="CREATORS"
                required
              >
                <input
                  value={form.creator}
                  onChange={(event) =>
                    updateField(
                      "creator",
                      event.target.value
                    )
                  }
                  placeholder="Saizor"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  VERIFIER
              ============================================== */}

              {!isImpossibleList && !isFutureList && <Field label="VERIFIER">
                <input
                  value={form.verifier}
                  onChange={(event) =>
                    updateField(
                      "verifier",
                      event.target.value
                    )
                  }
                  placeholder="Main"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>}

              {/* IMPOSSIBLE LIST WORLD RECORD */}
              {isImpossibleList && (
                <div className="rounded-xl border border-orange-500/25 bg-[#141419] p-5">
                  <h3 className="mb-2 text-xl font-black">World Record (WR)</h3>
                  <p className="mb-4 text-xs text-gray-400">
                    Enter the player and their best percentage. Leave both blank if there is no record.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="WR USER">
                      <input
                        value={form.wr_user}
                        onChange={(event) => updateField("wr_user", event.target.value)}
                        placeholder="Player username"
                        className={inputClass}
                        disabled={!canManage || busy}
                      />
                    </Field>
                    <Field label="WR %">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={form.wr_percent}
                        onChange={(event) => updateField("wr_percent", event.target.value)}
                        placeholder="e.g. 42.5"
                        className={inputClass}
                        disabled={!canManage || busy}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* LENGTH: DEMON + IMPOSSIBLE; CPS: IMPOSSIBLE ONLY */}
              {(activeList?.slug === "demon" || activeList?.slug === "challenge" || isImpossibleList) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {isImpossibleList && (
                    <Field label="CPS">
                      <input type="text" maxLength={120}
                        value={form.cps}
                        onChange={(event) => updateField("cps", event.target.value)}
                        placeholder="e.g. 3{6}1,000,000,000"
                        className={inputClass} disabled={!canManage || busy} />
                    </Field>
                  )}
                  <Field label="LENGTH">
                    <input value={form.level_length}
                      onChange={(event) => updateField("level_length", event.target.value)}
                      placeholder="e.g. 1:23, 35s, or 2h 10m"
                      maxLength={80}
                      className={inputClass} disabled={!canManage || busy} />
                  </Field>
                </div>
              )}

              {/* SONG — ALL LISTS */}
              <Field label="SONG">
                <input
                  value={form.song_name}
                  onChange={(event) => updateField("song_name", event.target.value)}
                  placeholder="Song title — optionally include artist"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  GEOMETRY DASH LEVEL ID
              ============================================== */}

              <Field label="GEOMETRY DASH LEVEL ID">
                <input
                  value={form.gd_level_id}
                  onChange={(event) =>
                    updateField(
                      "gd_level_id",
                      event.target.value
                    )
                  }
                  placeholder="Leave blank if unreleased"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  YOUTUBE VIDEO URL
              ============================================== */}

              <Field label="YOUTUBE VIDEO URL">
                <input
                  value={form.youtube_url}
                  onChange={(event) =>
                    updateField(
                      "youtube_url",
                      event.target.value
                    )
                  }
                  placeholder="Paste video URL"
                  className={inputClass}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  LEVEL IMAGE UPLOADER
              ============================================== */}

              <div className="rounded-xl border border-white/10 bg-[#141419] p-5">

                <div className="mb-4">
                  <p className="text-[11px] font-bold tracking-widest text-orange-500">
                    LEVEL MEDIA
                  </p>

                  <h3 className="mt-1 text-xl font-black text-white">
                    Level Image
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    Upload an image to display when
                    the level has no YouTube video.
                    YouTube videos take priority over images.
                  </p>
                </div>

                {/* UPLOAD AREA */}

                <label
                  className={`flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-[#101014] px-5 py-8 text-center transition hover:border-orange-500/50 ${
                    uploadingImage ||
                    busy ||
                    !canManage
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="mb-2 text-3xl">
                      🖼️
                    </div>

                    <p className="text-sm font-bold text-white">
                      {uploadingImage
                        ? "Uploading image..."
                        : "Click to upload an image"}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG, WEBP, or GIF
                      <br />
                      Maximum 5 MB
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={uploadLevelImage}
                    disabled={
                      !canManage ||
                      busy ||
                      uploadingImage
                    }
                    className="hidden"
                  />
                </label>

                {/* IMAGE PREVIEW */}

                {form.image_url && (
                  <div className="mt-5">

                    <p className="mb-3 text-xs font-bold text-orange-500">
                      CURRENT IMAGE
                    </p>

                    <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
                      <img
                        src={form.image_url}
                        alt="Level preview"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      This image will appear on the
                      public list if no YouTube video
                      is available.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "image_url",
                          ""
                        )
                      }
                      disabled={
                        !canManage ||
                        busy ||
                        uploadingImage
                      }
                      className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      REMOVE IMAGE
                    </button>

                  </div>
                )}

              </div>

              {/* ==============================================
                  DESCRIPTION
              ============================================== */}

              <Field label="DESCRIPTION">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Level description..."
                  className={`${inputClass} resize-y`}
                  disabled={!canManage || busy}
                />
              </Field>

              {/* ==============================================
                  LIST PERCENTAGE
              ============================================== */}

              {!isImpossibleList && !isFutureList && activeList?.slug !== "challenge" && <div className="rounded-xl border border-orange-500/25 bg-[#141419] p-5">

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold tracking-widest text-orange-500">
                      RECORD REQUIREMENTS
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      List Percentage
                    </h3>
                  </div>

                  <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black text-orange-400">
                    PLACER-CHOSEN
                  </span>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-gray-400">
                  The placer chooses the minimum
                  percentage for a partial record.
                  Qualifying records earn 50% of
                  the level&apos;s full points.
                </p>

                <div className="relative w-[180px]">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    value={form.list_percentage}
                    onChange={(event) =>
                      updateField(
                        "list_percentage",
                        event.target.value
                      )
                    }
                    placeholder="76"
                    className={`${inputClass} pr-12 text-lg font-bold`}
                    disabled={!canManage || busy}
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-orange-500">
                    %
                  </span>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Leave blank if not assigned.
                </p>

              </div>}

              {/* ==============================================
                  GAMEPLAY TAGS
              ============================================== */}

              <div className="rounded-xl border border-white/10 bg-[#141419] p-5">

                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold tracking-widest text-orange-500">
                      GAMEPLAY CLASSIFICATION
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      Level Tags
                    </h3>
                  </div>

                  <span className="rounded-md bg-[#29292f] px-3 py-1.5 text-xs font-bold">
                    {selectedTagIds.length} selected
                  </span>
                </div>

                {/* SELECTED TAGS */}

                {selectedTags.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          toggleTag(tag.id)
                        }
                        disabled={
                          !canManage || busy
                        }
                        className="rounded-md border border-orange-500/40 bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-300"
                      >
                        {tag.name} ×
                      </button>
                    ))}
                  </div>
                )}

                {/* TAG SEARCH */}

                <input
                  value={tagSearch}
                  onChange={(event) =>
                    setTagSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search gameplay tags..."
                  className={inputClass}
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={selectedOnly}
                      onChange={(event) =>
                        setSelectedOnly(
                          event.target.checked
                        )
                      }
                      className="accent-orange-500"
                    />

                    Show selected only
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTagIds([])
                    }
                    disabled={
                      !canManage || busy
                    }
                    className="text-xs font-bold text-red-400 disabled:opacity-40"
                  >
                    CLEAR ALL
                  </button>
                </div>

                {/* TAG CATEGORIES */}

                <div className="mt-5 max-h-[550px] space-y-6 overflow-y-auto pr-2">

                  {visibleTagGroups.map(
                    (group) => (
                      <div key={group.name}>

                        {group.name === "ILL EXCLUSIVE" && isImpossibleList && (
                          <div className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
                            <p className="text-sm font-bold text-orange-400">
                              ⚠ IMPOSSIBLE LIST EXCLUSIVE
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-300">
                              These tags are ONLY intended for levels on the Impossible List.
                              Do not assign them to Demon List, Challenge List, or Future Demon List entries.
                            </p>
                          </div>
                        )}

                        <h4 className="mb-3 border-b border-white/10 pb-2 text-[11px] font-black tracking-widest text-orange-500">
                          {group.name}
                        </h4>

                        <div className="flex flex-wrap gap-2">
                          {group.tags.map(
                            (tag) => {
                              const selected =
                                selectedTagIds.includes(
                                  tag.id
                                );

                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  disabled={
                                    !canManage ||
                                    busy
                                  }
                                  onClick={() =>
                                    toggleTag(
                                      tag.id
                                    )
                                  }
                                  onMouseEnter={(
                                    event
                                  ) =>
                                    setTooltip({
                                      text:
                                        tag.description ??
                                        tag.name,

                                      x:
                                        event.clientX,

                                      y:
                                        event.clientY,
                                    })
                                  }
                                  onMouseMove={(
                                    event
                                  ) =>
                                    setTooltip({
                                      text:
                                        tag.description ??
                                        tag.name,

                                      x:
                                        event.clientX,

                                      y:
                                        event.clientY,
                                    })
                                  }
                                  onMouseLeave={() =>
                                    setTooltip(null)
                                  }
                                  className={`rounded-md border px-3 py-2 text-xs font-bold transition ${
                                    selected
                                      ? "border-orange-500 bg-orange-500/20 text-orange-300"
                                      : "border-white/15 bg-[#25252b] text-gray-300 hover:border-orange-500/50"
                                  }`}
                                >
                                  {selected
                                    ? "✓ "
                                    : ""}

                                  {tag.name}
                                </button>
                              );
                            }
                          )}
                        </div>

                      </div>
                    )
                  )}

                  {visibleTagGroups.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No matching tags.
                    </p>
                  )}

                </div>
              </div>

              {/* ==============================================
                  RANKING INFORMATION
              ============================================== */}

              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <p className="text-xs font-bold text-blue-400">
                  AUTOMATIC RANKING
                </p>

                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  Occupied positions are shifted
                  automatically. Predicted Demon List
                  placements are stored separately
                  and never change when you reorder
                  the Future Demon List.
                </p>
              </div>

              {/* ==============================================
                  SAVE BUTTON
              ============================================== */}

              <button
                type="submit"
                disabled={
                  !canManage ||
                  busy ||
                  uploadingImage ||
                  checkingPermission
                }
                className={`${buttonClass} w-full bg-orange-500 py-4 text-base font-black hover:bg-orange-600`}
              >
                {uploadingImage
                  ? "UPLOADING IMAGE..."
                  : busy
                  ? "SAVING..."
                  : editingId
                  ? "SAVE LEVEL CHANGES"
                  : "ADD LEVEL"}
              </button>

            </form>
          </section>

          {/* ==================================================
              RIGHT: RANKING MANAGER
          ================================================== */}

          <section className="min-w-0 rounded-xl border border-white/10 bg-[#1b1b20] p-5">

            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-widest text-orange-500">
                  RANKING MANAGER
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {activeList?.name ?? "Levels"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  void refresh()
                }
                disabled={
                  busy || loading
                }
                className={`${buttonClass} bg-[#29292f]`}
              >
                REFRESH
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
              <span>
                {levels.length} ranked levels
              </span>

              <span className="text-xs">
                {Object.keys(drafts).length > 0 || editingId ? "Save edits before reordering" : "Drag to reorder"}
              </span>
            </div>

            {/* LEVEL SEARCH */}

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search levels, creators, or ranks..."
              className={`${inputClass} mb-4`}
            />

            {/* LEVEL CARDS */}

            <div className="max-h-[1200px] space-y-3 overflow-y-auto pr-1">

              {loading && (
                <p className="py-8 text-center text-gray-400">
                  Loading levels...
                </p>
              )}

              {!loading &&
                filteredLevels.length === 0 && (
                  <p className="py-8 text-center text-gray-500">
                    No levels found.
                  </p>
                )}

              {filteredLevels.map((level) => {
                const assignedIds = new Set(
                  levelTags
                    .filter(
                      (entry) =>
                        entry.level_id === level.id
                    )
                    .map(
                      (entry) => entry.tag_id
                    )
                );

                const assignedTags =
                  tags.filter((tag) =>
                    assignedIds.has(tag.id)
                  );

                return (
                  <div
                    key={level.id}
                    draggable={
                      canManage &&
                      !busy &&
                      !search.trim()
                    }
                    onDragStart={(event) =>
                      onDragStart(
                        event,
                        level.id
                      )
                    }
                    onDragOver={(event) => {
                      if (
                        !draggedId ||
                        busy
                      ) {
                        return;
                      }

                      event.preventDefault();

                      setDragOverId(
                        level.id
                      );
                    }}
                    onDrop={(event) =>
                      void onDrop(
                        event,
                        level.id
                      )
                    }
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    className={`rounded-xl border p-4 transition ${
                      dragOverId === level.id
                        ? "border-orange-500 bg-orange-500/10"
                        : editingId === level.id
                        ? "border-orange-500/50 bg-orange-500/5"
                        : "border-white/10 bg-[#242429]"
                    } ${
                      canManage &&
                      !search.trim()
                        ? "cursor-grab active:cursor-grabbing"
                        : ""
                    }`}
                  >

                    <div className="flex items-start gap-3">

                      {/* RANK */}

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#111115] text-lg font-black text-orange-500">
                        #{level.position}
                      </div>

                      {/* LEVEL DETAILS */}

                      <div className="min-w-0 flex-1">

                        <h3 className="break-words text-base font-black">
                          {level.name}
                        </h3>
                        {drafts[level.id] && (
                          <span className="mt-1 inline-block rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            UNSAVED DRAFT
                          </span>
                        )}

                        <p className="mt-1 text-xs text-gray-400">
                          Publisher:{" "}
                          <span className="text-gray-200">{level.publisher || "N/A"}</span>
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Creators:{" "}
                          <span className="text-gray-200">
                            {level.creator || "N/A"}
                          </span>
                        </p>

                        {!isImpossibleList && !isFutureList && <p className="mt-1 text-xs text-gray-400">
                          Verifier:{" "}
                          <span className="text-gray-200">
                            {level.verifier || "N/A"}
                          </span>
                        </p>}

                        {isImpossibleList && (
                          <p className="mt-2 text-xs text-gray-300">
                            <span className="font-bold text-orange-400">WR: </span>
                            {level.wr_user && level.wr_percent != null
                              ? `${level.wr_user} — ${level.wr_percent}%`
                              : "No record"}
                          </p>
                        )}

                        {/* FUTURE LIST RANKS */}

                        {isFutureList && (
                          <div className="mt-3 flex flex-wrap gap-2">

                            <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-300">
                              Future Rank: #{level.position}
                            </span>

                            <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-bold text-purple-300">
                              Predicted:{" "}
                              {level.predicted_position == null
                                ? "—"
                                : `#${level.predicted_position}`}
                            </span>

                          </div>
                        )}

                        {/* LIST PERCENTAGE */}

                        {!isImpossibleList && !isFutureList && activeList?.slug !== "challenge" && <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-500">
                            LIST PERCENTAGE
                          </span>

                          <span className="rounded-md border border-white/10 bg-[#151519] px-2 py-1 text-xs font-bold">
                            {level.list_percentage == null
                              ? "Not assigned"
                              : `${level.list_percentage}%`}
                          </span>
                        </div>}

                        {/* IMAGE STATUS */}

                        <div className="mt-3 flex flex-wrap items-center gap-2">

                          <span className="text-[11px] font-bold text-gray-500">
                            MEDIA
                          </span>

                          {level.youtube_url ? (
                            <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-400">
                              YOUTUBE
                            </span>
                          ) : null}

                          {level.image_url ? (
                            <span className="rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs font-bold text-green-400">
                              IMAGE
                            </span>
                          ) : null}

                          {!level.youtube_url &&
                            !level.image_url && (
                              <span className="rounded-md border border-white/10 bg-[#151519] px-2 py-1 text-xs text-gray-500">
                                NO MEDIA
                              </span>
                            )}

                        </div>

                        {/* ASSIGNED TAGS */}

                        {assignedTags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {assignedTags.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded border border-white/15 bg-[#151519] px-2 py-1 text-[10px] text-gray-400"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* EDIT / DELETE BUTTONS */}

                    <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">

                      <button
                        type="button"
                        onClick={() =>
                          editLevel(level)
                        }
                        disabled={
                          !canManage || busy
                        }
                        className={`${buttonClass} flex-1 bg-orange-500/10 text-orange-400`}
                      >
                        EDIT
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteLevel(level)
                        }
                        disabled={
                          !canManage || busy
                        }
                        className={`${buttonClass} flex-1 bg-red-500/10 text-red-400`}
                      >
                        DELETE
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>

            {/* FUTURE LIST EXPLANATION */}

            {isFutureList && (
              <div className="mt-5 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-xs leading-relaxed text-gray-400">
                <span className="font-bold text-purple-300">
                  Future Rank
                </span>{" "}
                controls the order on this list.{" "}
                <span className="font-bold text-purple-300">
                  Predicted Placement
                </span>{" "}
                estimates the real Demon List ranking.
                They are completely independent.
              </div>
            )}

            {/* ILL EXPLANATION */}

            {isImpossibleList && (
              <p className="mt-5 text-xs text-orange-400">
                ILL-exclusive gameplay tags are
                available in the tag editor.
              </p>
            )}

          </section>
        </div>
      </div>

      {/* FLOATING BULK SAVE CONTROLS */}
      {(Object.keys(drafts).length > 0 || editingId !== null) && canManage && (
        <div className="fixed bottom-5 right-5 z-[900] w-[min(380px,calc(100vw-40px))] rounded-xl border border-orange-500/50 bg-[#19191f]/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-white">BULK EDITING</p>
              <p className="text-xs text-gray-400">
                {Object.keys(drafts).length} staged level(s)
                {editingId ? " · current editor included on save" : ""}
              </p>
            </div>
            <span className="rounded bg-orange-500/15 px-2 py-1 text-xs font-bold text-orange-300">
              UNSAVED
            </span>
          </div>
          {saveAllProgress && <p className="mb-2 text-xs text-orange-300">{saveAllProgress}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void saveAllChanges()}
              disabled={busy || uploadingImage}
              className={`${buttonClass} flex-1 bg-orange-500 text-white hover:bg-orange-600`}
            >
              {busy ? "SAVING..." : "SAVE ALL CHANGES"}
            </button>
            {Object.keys(drafts).length > 0 && !busy && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Discard all staged edits?")) return;
                  setDrafts({});
                  if (editingId) resetEditor();
                  notify("Staged edits discarded.");
                }}
                className={`${buttonClass} bg-[#303039] text-gray-200`}
              >
                DISCARD
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Changes are staged in this tab until saved. Do not refresh or close it.
          </p>
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