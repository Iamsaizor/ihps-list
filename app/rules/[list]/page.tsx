import Link from "next/link";
import { notFound } from "next/navigation";

type Rule = { title: string; description: string };
type ListRules = { title: string; subtitle: string; rules: Rule[]; note?: string };
const rule = (title: string, description: string): Rule => ({ title, description });
const RULES: Record<string, ListRules> = {
  demon: {
    title: "Demon List Rules",
    subtitle: "Rules for verified levels ranked by difficulty.",
    rules: [
      rule("Verification", "Levels must be verified and uploaded to ihPS."),
      rule("Length", "Levels must be at least 30 seconds long."),
      rule("Fair Gameplay", "Levels cannot rely on luck, RNG, or broken game mechanics."),
      rule("Accessibility", "Levels must be possible on all supported devices with standard mods like CBF and FPS bypass."),
      rule("TPS Bypass", "TPS bypass is not allowed. Levels must be possible at 240 TPS."),
      rule("Buffed Versions", "Buffed copies of existing levels must have major gameplay changes to be ranked separately."),
      rule("Legitimate Verification", "Macros, noclip, speedhacks, and other cheats are not allowed."),
      rule("Difficulty", "Levels are ranked by how hard they are to beat from start to finish."),
      rule("Quality", "Levels must have working, properly made gameplay."),
      rule("Removal", "Levels that break these rules may be removed."),
    ],
  },
  challenge: {
    title: "Challenge List Rules",
    subtitle: "Rules for verified challenges shorter than 30 seconds.",
    rules: [
      rule("Verification", "Challenges must be verified and uploaded to ihPS."),
      rule("Length", "Challenges must be under 30 seconds long. Exactly 30 seconds belongs on the Demon List."),
      rule("Fair Gameplay", "Challenges must rely on skill, not luck, RNG, or broken mechanics."),
      rule("Accessibility", "Challenges must be possible on all supported devices with standard mods like CBF and FPS bypass."),
      rule("TPS Bypass", "TPS bypass is not allowed. Challenges must be possible at 240 TPS."),
      rule("Buffed Versions", "Buffed copies must have major gameplay changes to be ranked separately."),
      rule("Legitimate Verification", "Macros, noclip, speedhacks, and other cheats are not allowed."),
      rule("Difficulty", "Challenges are ranked by how hard they are to complete in one attempt."),
      rule("Quality", "Challenges must have working, properly made gameplay."),
      rule("Removal", "Challenges that break these rules may be removed."),
    ],
  },
  impossible: {
    title: "Impossible List Rules",
    subtitle: "Rules for extremely difficult but theoretically possible levels.",
    rules: [
      rule("Possibility", "Every level must be theoretically possible in Geometry Dash."),
      rule("Length", "Levels must be at least 30 seconds long."),
      rule("Completion", "There must be at least one possible way to beat the level, no matter how difficult it is."),
      rule("Bot Verification", "Every level must have a successful bot completion to prove it is possible."),
      rule("Human Verification", "Levels do not need to be verified by a human."),
      rule("Bot-Only Gameplay", "Gameplay that only a bot could realistically complete is allowed, as long as it is possible."),
      rule("TPS Bypass", "TPS bypass is allowed and encouraged."),
      rule("CPS Limit", "There is no CPS limit."),
      rule("Swift Clicks", "There is no limit on swift clicks."),
      rule("Extreme Difficulty", "Levels can require extremely high CPS, precise timings, and complicated inputs."),
      rule("Broken Mechanics", "Levels cannot rely on broken game mechanics that make them impossible."),
      rule("Buffed Versions", "Low-effort, hyperbuffed copies of existing levels (such as BLEAKEST) are not allowed."),
      rule("Quality", "Levels must have either decent decoration or meaningful technical innovation. Levels with neither will not be accepted."),
      rule("Proof", "Staff may ask for the bot completion or other evidence showing how the level is possible."),
      rule("Rankings", "Levels are ranked based on estimated human difficulty, botting difficulty, and technical requirements."),
      rule("Verified Levels", "If a level is legitimately verified by a human, it will be removed from the Impossible List and considered for the Demon List."),
      rule("Removal", "Levels that are proven impossible or break the rules will be removed."),
    ],
    note: "Ranking considers human difficulty, botting difficulty, and technical requirements (TPS/FPS, CPS, swift clicks, and precision). No single factor automatically decides placement.",
  },
  "future-demon": {
    title: "Future Demon List Rules",
    subtitle: "Rules for rate-worthy levels expected to be verified soon.",
    rules: [
      rule("Verification", "Levels must not already be verified."),
      rule("Rate-Worthy", "Levels must have decoration and gameplay good enough to receive a rate on ihPS."),
      rule("Verification Time", "Levels must be realistically beatable within 12 months of being added."),
      rule("Active Verifier", "An active verifier is not required, but levels with someone actively verifying them will be given priority."),
      rule("TPS Bypass", "TPS bypass is not allowed. Levels must be possible at 240 TPS."),
      rule("Completion", "Levels must have enough finished gameplay for staff to judge their difficulty."),
      rule("Difficulty", "Levels are ranked by how hard they are expected to be when verified."),
      rule("Progress", "Staff may use player runs and verification progress to help decide placements."),
      rule("Verified Levels", "Once verified and uploaded, levels may be moved to the Demon List."),
      rule("Quality", "Unfinished, low-effort, or non-rate-worthy levels may be rejected."),
      rule("12-Month Review", "If a level remains unverified after 12 months, staff will review whether it can still realistically be verified. It will not be automatically removed."),
      rule("Removal", "Levels may be removed if they are abandoned, proven impossible, no longer realistically verifiable, or break the rules."),
    ],
  },
};
const links = [
  { slug: "demon", label: "Demon" },
  { slug: "challenge", label: "Challenge" },
  { slug: "impossible", label: "Impossible" },
  { slug: "future-demon", label: "Future Demon" },
];
export function generateStaticParams() { return links.map(({ slug }) => ({ list: slug })); }
export default async function RulesPage({ params }: { params: Promise<{ list: string }> }) {
  const { list } = await params;
  const data = RULES[list];
  if (!data) notFound();
  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <header className="border-b border-white/10 bg-[#17171b] px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-3xl font-black tracking-tight text-orange-500">ihPS</Link>
          <Link href="/" className="rounded-lg border border-white/15 bg-[#29292f] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-orange-500 hover:text-white">← Back to Lists</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">ihPS · List Guidelines</p>
        <h1 className="text-3xl font-black sm:text-4xl">{data.title}</h1>
        <p className="mt-3 text-gray-400">{data.subtitle}</p>
        <nav aria-label="Other list rules" className="mt-7 flex flex-wrap gap-2">
          {links.map(({ slug, label }) => <Link key={slug} href={`/rules/${slug}`} aria-current={slug === list ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-xs font-bold transition sm:text-sm ${slug === list ? "border-orange-500 bg-orange-500 text-white" : "border-white/15 bg-[#242429] text-gray-300 hover:border-orange-500/60 hover:text-white"}`}>{label}</Link>)}
        </nav>
        <section aria-label="List rules" className="mt-7 overflow-hidden rounded-xl border border-white/15 bg-[#1b1b20]">
          <ol className="divide-y divide-white/10">
            {data.rules.map((item, index) => <li key={item.title} className="flex gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 text-sm font-bold text-orange-400">{index + 1}</span>
              <div className="min-w-0"><h2 className="font-bold text-white">{item.title}</h2><p className="mt-1 text-sm leading-relaxed text-gray-300">{item.description}</p></div>
            </li>)}
          </ol>
        </section>
        {data.note && <aside className="mt-5 rounded-xl border border-orange-500/25 bg-orange-500/5 p-5"><h2 className="font-bold text-orange-300">How levels are ranked</h2><p className="mt-2 text-sm leading-relaxed text-gray-300">{data.note}</p></aside>}
        <Link href="/" className="mt-8 inline-flex rounded-lg border border-white/20 bg-[#29292f] px-4 py-3 text-sm font-bold text-white transition hover:border-orange-500">← Return to ihPS</Link>
      </div>
    </main>
  );
}
