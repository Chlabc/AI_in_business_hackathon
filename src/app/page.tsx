import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GuidedDemo } from "@/components/GuidedDemo";
import { Reveal } from "@/components/Reveal";
import { SCOPE_SENTENCE } from "@/lib/phases";
import { SCENARIOS } from "@/data/scenarios";
import {
  DrillIcon,
  LightbulbIcon,
  LockIcon,
  ScoreIcon,
} from "@/components/NavIcons";

const WHAT_YOU_GET = [
  {
    title: "A live voice roleplay",
    body: "An actual spoken conversation with an AI client — not a script you read, not a chatbot you type at.",
    Icon: DrillIcon,
  },
  {
    title: "Scoring against a real rubric",
    body: "Six specific things a good response should do, checked against what you actually said, every single drill.",
    Icon: ScoreIcon,
  },
  {
    title: "Practice that's yours, privately",
    body: "Nothing goes to your manager unless you choose to share it — and even then, they see a summary, never the transcript.",
    Icon: LockIcon,
  },
  {
    title: "A better line for next time",
    body: "Not just 'do better' — an actual suggested response you could have used, grounded in your firm's approved talk-track.",
    Icon: LightbulbIcon,
  },
];

const AUDIENCES = [
  {
    title: "For agents",
    body: "Practise the objection in a realistic voice call and walk away with a score you can act on.",
  },
  {
    title: "For principals",
    body: "See progress summaries, not raw call recordings, so the system reads as coaching rather than surveillance.",
  },
  {
    title: "For the agency",
    body: "Update talk tracks, price floors and red lines in one place, and the AI client and the scorer both follow them.",
  },
];

const scenario = SCENARIOS.find((s) => s.recommended) ?? SCENARIOS[0];

/**
 * Cover photograph. Put the file in /public and name it cover.jpg.
 * If it isn't there, url() paints nothing and the drawn gradient behind it
 * shows through — so a missing file degrades instead of breaking the page.
 */
const COVER_STYLE = {
  "--cover-image": 'url("/cover.jpg")',
} as React.CSSProperties;

/** Soundwave motif — the product is voice, so the cover says so without a photo. */
function CoverWaves() {
  const bars = Array.from({ length: 48 }, (_, i) => {
    // Deterministic, not random, so server and client render identically.
    const wave = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 0.29) * 0.5;
    return 8 + Math.abs(wave) * 46;
  });
  return (
    <svg
      className="cover-waves"
      viewBox="0 0 480 120"
      preserveAspectRatio="none"
      aria-hidden
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 10 + 2}
          y={60 - h / 2}
          width={3.5}
          height={h}
          rx={1.75}
          fill="rgba(201,169,97,0.22)"
        />
      ))}
    </svg>
  );
}

/** A small, honest preview of the real drill — actual scenario copy, not a mockup. */
function LivePreviewCard() {
  return (
    <div className="surface-card w-full max-w-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-audio-soft px-2 py-0.5 text-xs font-medium text-audio">
          ● Live drill
        </span>
        <span className="text-xs text-muted">{scenario.title}</span>
      </div>
      <div className="mt-4 flex justify-start">
        <div className="max-w-[85%] rounded-2xl bg-background px-3 py-2 text-sm text-foreground">
          <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted">
            Client
          </p>
          &ldquo;{scenario.openingLine}&rdquo;
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-fg">
          <p className="mb-0.5 text-[10px] uppercase tracking-wide opacity-75">
            You
          </p>
          &ldquo;Fair question — what does their quote actually include?&rdquo;
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <span className="text-2xl font-semibold text-ok">76</span>
        <div>
          <p className="text-xs font-medium text-foreground">
            Explored the objection
          </p>
          <p className="text-xs text-muted">Before defending the price — nice.</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppShell variant="marketing">
      <div className="marketing-shell">
        {/* ── Cover ───────────────────────────────────────────────────────
            COVER_STYLE points at a file in /public. If it isn't there the
            url() paints nothing and the drawn gradient shows instead, so the
            page never breaks over a missing image. */}
        <section className="cover" style={COVER_STYLE}>
          <CoverWaves />
          <div className="cover-inner">
            <p className="hero-kicker">
              AI real estate coaching for agents and principals
            </p>
            <div className="cover-rule mt-5" />
            <h1 className="display-serif mt-6 text-4xl leading-[1.04] text-white sm:text-5xl lg:text-[3.75rem]">
              Practise the call you keep losing.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Cornerman finds the moment you lose listings, puts you in a live
              spoken roleplay against a client who pushes back, and scores you
              against your own firm&apos;s playbook.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/login"
                className="btn-lift inline-flex h-12 items-center justify-center rounded-full bg-brand-gold px-8 text-base font-semibold text-brand-gold-fg"
              >
                Let&apos;s get started &rsaquo;
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                See how it works first &rsaquo;
              </a>
            </div>
          </div>

          <a href="#how-it-works" className="cover-scroll">
            <span>Scroll</span>
            <span aria-hidden>↓</span>
          </a>
        </section>

        {/* ── The problem, stated once, in large type ──────────────────── */}
        <section className="band">
          <div className="band-inner band-narrow">
            <Reveal>
              <p className="band-eyebrow">The problem</p>
              <h2 className="band-title text-foreground">
                Agents don&apos;t lose listings because they lack knowledge. They lose
                them in the ten seconds after a client says &ldquo;that&apos;s
                too expensive.&rdquo;
              </h2>
              <p className="band-lede">{SCOPE_SENTENCE}</p>
            </Reveal>
          </div>
        </section>

        {/* ── A real drill ─────────────────────────────────────────────── */}
        <section className="band band-alt">
          <div className="band-inner">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
              <Reveal>
                <p className="band-eyebrow">A real drill</p>
                <h2 className="band-title text-foreground">
                  This is what a session looks like.
                </h2>
                <p className="band-lede">
                  The client pushes back on price. You answer out loud. The
                  moment you finish, you are scored against the six things your
                  firm&apos;s playbook says a good answer does.
                </p>
                <dl className="mt-10 flex flex-wrap gap-x-14 gap-y-6">
                  {[
                    ["12", "calls analysed"],
                    ["6", "rubric checks"],
                    ["1", "clear next step"],
                  ].map(([n, label]) => (
                    <div key={label}>
                      <dt className="display-serif text-4xl text-foreground">
                        {n}
                      </dt>
                      <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
                        {label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
              <Reveal delay={1} className="flex justify-center lg:justify-end">
                <LivePreviewCard />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Walkthrough ──────────────────────────────────────────────── */}
        <section id="how-it-works" className="band scroll-mt-16">
          <div className="band-inner">
            <Reveal>
              <GuidedDemo />
            </Reveal>
          </div>
        </section>

        {/* ── Pull quote ───────────────────────────────────────────────── */}
        <section className="band band-tight band-dark">
          <div className="band-inner band-narrow text-center">
            <Reveal>
              <p className="pullquote text-white">
                &ldquo;The hard part was never knowing what to say. It was saying
                it while someone pushed back.&rdquo;
              </p>
              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/45">
                The premise Cornerman is built on
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── What you get ─────────────────────────────────────────────── */}
        <section id="what-you-get" className="band scroll-mt-16">
          <div className="band-inner">
            <Reveal>
              <p className="band-eyebrow">What you get</p>
              <h2 className="band-title text-foreground">
                Not a course. A practice partner that talks back.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-x-14 gap-y-12 sm:grid-cols-2">
              {WHAT_YOU_GET.map((item, i) => (
                <Reveal
                  key={item.title}
                  as="article"
                  delay={i % 2 === 0 ? 0 : 1}
                >
                  <item.Icon className="h-7 w-7 text-accent" />
                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 max-w-md leading-relaxed text-muted">
                    {item.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who it's for ─────────────────────────────────────────────── */}
        <section className="band band-alt">
          <div className="band-inner">
            <Reveal>
              <p className="band-eyebrow">Why this is useful</p>
              <h2 className="band-title text-foreground">
                Built for the moment agents lose confidence.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-x-14 gap-y-10 lg:grid-cols-3">
              {AUDIENCES.map((a, i) => (
                <Reveal
                  key={a.title}
                  as="article"
                  delay={i === 0 ? 0 : i === 1 ? 1 : 2}
                  className="border-t border-border pt-6"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">
                    {a.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted">{a.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Close ────────────────────────────────────────────────────── */}
        <section className="band band-dark">
          <div className="band-inner band-narrow text-center">
            <Reveal>
              <h2 className="band-title mt-0 text-white">
                Ready to stop losing on price?
              </h2>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                <Link
                  href="/login"
                  className="btn-lift inline-flex h-12 items-center justify-center rounded-full bg-brand-gold px-8 text-base font-semibold text-brand-gold-fg"
                >
                  Let&apos;s get started &rsaquo;
                </Link>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  See how it works &rsaquo;
                </a>
              </div>
              <div className="mt-16 border-t border-white/10 pt-8">
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/40">
                  Built with
                </p>
                <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-sm text-white/55">
                  {[
                    "ElevenLabs",
                    "Next.js",
                    "React",
                    "TypeScript",
                    "Tailwind CSS",
                  ].map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        <footer className="band band-tight border-t border-border">
          <p className="text-center text-xs text-muted">
            Forward &middot; AI in Business Hackathon &middot; Track 1 +
            ElevenLabs
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
