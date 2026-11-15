import Link from "next/link";
import { notFound } from "next/navigation";

type Rule = { title: string; description: string };
type Section = { heading: string; rules: Rule[] };
type ListRules = { title: string; subtitle: string; sections: Section[] };

const RULES: Record<string, ListRules> = {
  "demon": { title: "THE HARDEST DEMONS LIST", subtitle: "Rated, verified Extreme Demons — ranked from hardest to easiest.", sections: [
    { heading: "Placement Guidelines", rules: [
      { title: "Verification", description: "Every level must be legitimately verified from 0% to 100% and uploaded to ihPS." },
      { title: "Extreme Demon Rating", description: "Every ranked level MUST have an official Extreme Demon rating on ihPS. Unrated levels and levels rated below Extreme Demon are ineligible." },
      { title: "Minimum Length", description: "Levels must be at least 30 seconds long. Levels lasting 0–29 seconds belong on the Challenge List." },
      { title: "Comprehensive Ranking", description: "The Demon List attempts to rank every rated, legitimately verified Extreme Demon on the server. There is no additional difficulty cutoff." },
      { title: "No Submission Required", description: "Qualifying levels may be added by staff without a request or formal submission from the creator." },
      { title: "Two-Player Levels", description: "Two-player levels are judged by their difficulty when completed solo, controlling both players." },
      { title: "Official Version", description: "The evaluated gameplay must correspond to the verified and rated version." },
    ] },
    { heading: "Gameplay and Physics", rules: [
      { title: "Fair Gameplay", description: "Levels must be skill-based and cannot rely on unavoidable RNG, pure luck, or game-breaking mechanics." },
      { title: "Vanilla 240 TPS", description: "Levels must be possible under standard 240 TPS physics. TPS bypass cannot be required." },
      { title: "Permitted Modifications", description: "CBF and FPS bypass are permitted as long as the level remains possible at 240 TPS." },
      { title: "Human Feasibility", description: "All required inputs must be legitimately executable by a human." },
      { title: "Difficult Mechanics", description: "Frame-perfect timings, memory, high CPS, and unusual mechanics are allowed if deterministic and legitimately achievable." },
      { title: "No Cheats for Verification", description: "Macros, bots, noclip, speedhacks, hitbox edits, and other illegitimate assistance cannot be used to verify a level." },
    ] },
    { heading: "Originality and Ranking", rules: [
      { title: "Buffed Versions", description: "Separate copies or buffed edits must feature significantly altered gameplay to qualify for independent ranking." },
      { title: "Easier Routes", description: "A legitimate easier route must be considered when evaluating difficulty." },
      { title: "Full-Level Difficulty", description: "Rankings reflect the difficulty of completing 0–100%, including consistency, endurance, chokepoints, and transitions." },
      { title: "Difficulty Evidence", description: "Staff may consider victor opinions, legitimate runs, and other evidence. Attempt counts alone do not decide placement." },
      { title: "No Separate Quality Control", description: "Official Extreme Demon rating already fulfills the list's quality requirement; no additional decoration review is imposed." },
    ] },
    { heading: "Updates and Removal", rules: [
      { title: "Gameplay Changes", description: "Major buffs or nerfs may require reverification and reranking." },
      { title: "Cosmetic Changes", description: "Decoration-only and optimization updates are generally acceptable if gameplay remains equivalent." },
      { title: "Invalid Verification", description: "A level with a proven illegitimate verification may be suspended or removed until legitimately reverified." },
      { title: "Loss of Rating", description: "A level that no longer has an official Extreme Demon rating is ineligible." },
      { title: "Rule Violations", description: "Staff may review or remove levels that violate eligibility requirements and should explain the reason." },
    ] },
  ] },
  "challenge": { title: "THE HARDEST CHALLENGES LIST", subtitle: "Complete, short-form tests of skill — not unfinished Demon layouts.", sections: [
    { heading: "Placement Guidelines", rules: [
      { title: "Verification", description: "Challenges must be legitimately verified from 0% to 100% and uploaded to ihPS." },
      { title: "Length and Classification", description: "Challenges MUST be 0–29 seconds long and classified Tiny or Short. At 30 seconds or longer, a level belongs under Demon List eligibility rules." },
      { title: "No Submission Required", description: "Staff may add eligible challenges without a formal submission." },
      { title: "Two-Player Challenges", description: "Two-player challenges are evaluated by solo difficulty." },
    ] },
    { heading: "Challenge Identity", rules: [
      { title: "Standalone Challenge", description: "Gameplay must be deliberately designed as a complete, self-contained challenge with a clear beginning and ending." },
      { title: "Not an Unfinished Layout", description: "An unfinished Extreme Demon layout, abandoned fragment, or arbitrary slice of a longer level is not a challenge merely because it is short and difficult." },
      { title: "Layouts Are Allowed", description: "Decoration is not mandatory. A complete, intentional layout challenge can qualify." },
      { title: "Any Gamemode", description: "Challenges may use any gamemode or combination; they do not have to be wave spam or timing-only." },
      { title: "Gameplay Quality", description: "The sequence must function as a deliberate challenge rather than a random collection of obstacles." },
    ] },
    { heading: "Physics and Legitimacy", rules: [
      { title: "Fair Gameplay", description: "No unavoidable RNG, pure luck, or broken mechanics." },
      { title: "240 TPS", description: "Must be possible at vanilla 240 TPS; TPS bypass is prohibited." },
      { title: "CBF and FPS Bypass", description: "Both are permitted if 240 TPS physics remain unchanged." },
      { title: "Legitimate Verification", description: "No macros, bots, noclip, speedhacks, or other cheats during verification." },
      { title: "Precision", description: "Frame-perfect timings and high CPS are allowed when humanly achievable." },
    ] },
    { heading: "Ranking and Maintenance", rules: [
      { title: "Originality", description: "Minor buffs or near-identical copies are not independently eligible without substantial gameplay changes." },
      { title: "Difficulty", description: "Rank by the difficulty of completing the entire challenge in one legitimate attempt." },
      { title: "Easier Routes", description: "Legitimate easier methods must be considered." },
      { title: "Updates", description: "Significant gameplay changes may require reverification or reranking." },
      { title: "Removal", description: "Invalid verification, failure to meet challenge identity, length violations, or other rule breaches may result in removal." },
    ] },
  ] },
  "impossible": { title: "THE HARDEST IMPOSSIBLE LEVELS LIST", subtitle: "Mandatory level submissions, successful bot proof, and technical quality control.", sections: [
    { heading: "Level Submission and Eligibility", rules: [
      { title: "Mandatory Submission", description: "The ILL is the only ihPS list requiring formal level submission." },
      { title: "Creator's Bot Proof", description: "Creators MUST successfully bot their own levels from 0% to 100% and submit convincing proof. Staff are not obligated to bot them." },
      { title: "Minimum Length", description: "Levels must be at least 30 seconds long." },
      { title: "Actual Bot-Verifiability", description: "The level must be completable by a real bot under a declared, reproducible setup. Mathematical possibility alone does not qualify." },
      { title: "Uploaded Level", description: "The level must be uploaded to ihPS for review." },
      { title: "Human Verification", description: "A human completion is not required; the list is for levels beyond realistic human capabilities." },
    ] },
    { heading: "Technical Standards", rules: [
      { title: "TPS and FPS Bypass", description: "TPS and FPS bypass are permitted; levels need not work at vanilla 240 TPS." },
      { title: "No Arbitrary CPS Cap", description: "There is no fixed CPS ceiling, but the required inputs must actually be executable by the claimed botting setup." },
      { title: "Swift Clicks", description: "Swift clicks and dense within-frame input sequences are allowed when demonstrably executable." },
      { title: "Advanced Mechanics", description: "Macrobuffs, alignments, MINUSwave, counters, snaps, and complex trigger systems are permitted when valid and reproducible." },
      { title: "Declared Conditions", description: "Required TPS, FPS, input methods, tools, and relevant technical settings must be documented." },
      { title: "Engine Integrity", description: "Levels cannot rely on impossible game states, falsified behavior, or input requirements beyond their actual botting setup." },
    ] },
    { heading: "Quality Control", rules: [
      { title: "Meaningful Effort", description: "A level must demonstrate meaningful effort in decoration, gameplay design, or technical innovation." },
      { title: "Minimal Decoration", description: "Layout-style or minimalist levels can qualify if the technical design or gameplay is sufficiently innovative." },
      { title: "Originality", description: "Simple hyperbuffed copies, repetitive input inflation, and minimally altered versions may be rejected." },
      { title: "Functional Gameplay", description: "The level must run and behave consistently under its documented conditions." },
      { title: "No Decoration Rating Requirement", description: "ILL quality control is independent of ihPS's normal rating standards." },
    ] },
    { heading: "Ranking and Review", rules: [
      { title: "Overall Difficulty", description: "Consider input complexity, timing precision, CPS, swift clicks, botting difficulty, and estimated hypothetical human difficulty." },
      { title: "No Single Metric", description: "Neither CPS nor botting difficulty alone determines placement." },
      { title: "Evidence Review", description: "Staff may request raw bot footage, macros, input logs, or reproducibility details." },
      { title: "Invalid Proof", description: "A level with fabricated or invalid bot proof is ineligible until valid evidence is supplied." },
      { title: "Human Completion", description: "If legitimately completed by a human, its ILL eligibility is reviewed and it may be considered for the Demon List if rated." },
      { title: "TPLL Distinction", description: "Unbottable but mathematically possible levels belong to the separate TPLL category, not the ILL." },
    ] },
  ] },
  "impossible-records": { title: "IMPOSSIBLE LIST RECORD RULES", subtitle: "Record submissions are separate from ILL level submissions.", sections: [
    { heading: "Record Eligibility", rules: [
      { title: "Listed Level", description: "Records must correspond to a recognized ILL level and its approved gameplay version." },
      { title: "Claimed Progress", description: "The submitted progress must be clearly demonstrated; any minimum record threshold is determined by ILL staff." },
      { title: "Correct Conditions", description: "The record must use the technical conditions permitted for that level." },
    ] },
    { heading: "Evidence and Integrity", rules: [
      { title: "Video Evidence", description: "Provide footage clearly showing the level and claimed progress." },
      { title: "Bot and Input Data", description: "Provide relevant macro, input-log, or technical data when required for legitimacy review." },
      { title: "No Fabrication", description: "Spliced, manipulated, or falsely represented gameplay is prohibited." },
      { title: "Raw Evidence", description: "Staff may request original footage and supporting data for disputed records." },
      { title: "Reproducibility", description: "Claimed inputs and progress must be consistent with the declared setup." },
    ] },
    { heading: "Review and Appeals", rules: [
      { title: "Staff Review", description: "Records are subject to evidence and legitimacy checks." },
      { title: "Rejection", description: "Insufficient, inconsistent, or fraudulent evidence may lead to rejection." },
      { title: "Appeals", description: "A rejected record may be reconsidered when new evidence is supplied." },
      { title: "Revocation", description: "Previously accepted records may be revoked if later evidence proves them invalid." },
    ] },
  ] },
  "future-demon": { title: "THE FUTURE DEMONS LIST", subtitle: "Unverified, rate-worthy levels with realistic human verification prospects.", sections: [
    { heading: "Eligibility", rules: [
      { title: "Unverified", description: "The level must not already be legitimately verified." },
      { title: "Rate-Worthy", description: "The level must be sufficiently complete and polished to be considered rate-worthy in ihPS." },
      { title: "Minimum Length", description: "Levels must be at least 30 seconds long." },
      { title: "No Submission Required", description: "Staff may add qualifying levels without formal submission." },
      { title: "Complete Gameplay", description: "The level must have a complete playable sequence rather than an unfinished layout." },
      { title: "Human Feasibility", description: "Verification must be realistically achievable by a human." },
    ] },
    { heading: "Physics and Gameplay", rules: [
      { title: "240 TPS", description: "Must be possible at vanilla 240 TPS. TPS bypass is prohibited." },
      { title: "CBF and FPS Bypass", description: "Permitted as long as the physics requirement is preserved." },
      { title: "Fair Gameplay", description: "No unavoidable RNG, pure luck, or broken mechanics." },
      { title: "Originality", description: "Simple buffs or copies must feature substantial gameplay differences." },
    ] },
    { heading: "Verification Outlook", rules: [
      { title: "Approximate 12-Month Window", description: "Levels should reasonably be expected to receive legitimate verification within approximately 12 months." },
      { title: "Active Verifier", description: "An active verifier is not mandatory, but meaningful ongoing progress may receive priority." },
      { title: "Progress Evidence", description: "Staff may consider legitimate runs, timing analysis, and verifier progress." },
      { title: "Twelve-Month Review", description: "After 12 months without verification, staff review the level; removal is NOT automatic." },
    ] },
    { heading: "Rankings and Transfer", rules: [
      { title: "Estimated Rankings", description: "Placements are provisional estimates of eventual full-level difficulty." },
      { title: "Gameplay Updates", description: "Significant buffs or nerfs may require reevaluation." },
      { title: "After Verification", description: "Once verified, the level leaves the Future List; it may join the Demon List once rated Extreme Demon and otherwise eligible." },
      { title: "Removal", description: "Abandoned, demonstrably impossible, or no-longer-realistically-verifiable levels may be removed after review." },
    ] },
  ] },
};

const links = [
  { slug: "demon", label: "Demon List" },
  { slug: "challenge", label: "Challenge List" },
  { slug: "impossible", label: "ILL Placement" },
  { slug: "impossible-records", label: "ILL Records" },
  { slug: "future-demon", label: "Future List" },
];

export function generateStaticParams() {
  return links.map(({ slug }) => ({ list: slug }));
}

export default async function RulesPage({ params }: { params: Promise<{ list: string }> }) {
  const { list } = await params;
  const data = RULES[list];
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-[#101014] text-white">
      <header className="border-b border-[#303036] bg-[#17171b]">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-3">
          <Link href="/" className="text-[28px] font-black tracking-tight text-[#ff7900]">ihPS</Link>
          <Link href="/" className="rounded-md border border-[#45454d] bg-[#27272d] px-4 py-2 text-xs font-bold transition hover:border-[#ff7900]">← Back to Lists</Link>
        </div>
      </header>
      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-7">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.22em] text-[#ff7900]">IHPS · LIST GUIDELINES</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{data.title}</h1>
          <p className="mt-2 text-sm text-[#a9bacf]">{data.subtitle}</p>
        </div>
        <nav aria-label="Choose a list's rules" className="mb-7 flex flex-wrap gap-2">
          {links.map(({ slug, label }) => (
            <Link key={slug} href={`/rules/${slug}`} aria-current={slug === list ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-xs font-bold transition ${slug === list ? "border-[#ff7900] bg-[#ff7900] text-white" : "border-[#45454d] bg-[#26262c] text-white hover:border-[#ff7900]"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="grid items-start gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[#35353d] bg-[#1c1c21] p-5 lg:sticky lg:top-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#ff7900]">Table of Contents</h2>
            <nav aria-label="Page sections" className="flex flex-col gap-1">
              {data.sections.map((section, i) => (
                <a key={section.heading} href={`#section-${i + 1}`}
                  className="rounded-md px-2 py-2 text-sm text-[#c5c5cd] transition hover:bg-[#303037] hover:text-[#ff7900]">
                  <span className="mr-2 font-bold text-[#ff7900]">{String(i + 1).padStart(2, "0")}</span>{section.heading}
                </a>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
            {data.sections.map((section, sectionIndex) => (
              <section id={`section-${sectionIndex + 1}`} key={section.heading}
                className="mb-5 scroll-mt-6 overflow-hidden rounded-xl border border-[#35353d] bg-[#1c1c21]">
                <div className="border-b border-[#35353d] bg-[#202026] px-5 py-4">
                  <h2 className="text-base font-black sm:text-lg">
                    <span className="mr-3 text-[#ff7900]">{String(sectionIndex + 1).padStart(2, "0")}.</span>
                    {section.heading}
                  </h2>
                </div>
                <ol className="divide-y divide-[#35353d]">
                  {section.rules.map((item, index) => (
                    <li key={item.title} className="flex items-start gap-4 px-5 py-5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#79400c] bg-[#2c231c] text-xs font-bold text-[#ff7900]">{index + 1}</span>
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[#d1d1d8]">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            <p className="pt-3 text-center text-xs text-[#868690]">ihPS · Draft rules — subject to List Team approval</p>
          </div>
        </div>
      </div>
    </main>
  );
}
