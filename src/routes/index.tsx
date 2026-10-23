import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand";
import { publishedSubjects, useContent } from "@/lib/content";
import { photoOf, plural } from "@/lib/format";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({ component: Landing });

const faqs = [
  {
    q: "What is Richmirabel?",
    a: "A JAMB and WAEC study space organised by topic. You read a short note, then sit a short set on that topic only.",
  },
  {
    q: "Is it for JAMB, WAEC, or both?",
    a: "Both. Richmirabel is for Science students. Physics, Chemistry, Biology, and Mathematics are open now.",
  },
  {
    q: "How does topic-by-topic study work?",
    a: "Choose a subject, open one topic, read the note, then answer the questions that belong to it.",
  },
  {
    q: "What happens during the free trial?",
    a: "You get 48 hours from the moment you finish setup. Notes and practice are open for those two days. After that, notes stay readable.",
  },
  {
    q: "How much does term access cost?",
    a: "₦4,500 for the term, after your two free days.",
  },
  {
    q: "Can I track my progress?",
    a: "Yes. After you submit a set, your best score for that topic is saved, and your dashboard points you to the topic to revisit.",
  },
  {
    q: "Can I use it on another phone?",
    a: "Your progress is saved on the device you study on. Syncing across devices is coming.",
  },
];

function WaveRule() {
  return (
    <svg viewBox="0 0 280 48" className="h-10 w-full max-w-xs" aria-hidden>
      <path className="draw-line" d="M4 28 C 40 8, 70 44, 110 24 S 180 8, 220 26 270 40, 276 18" fill="none" stroke="#a6843d" strokeWidth="1.6" />
    </svg>
  );
}

function Landing() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);
  const science = ["physics", "chemistry", "biology", "mathematics"]
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal");
    nodes.forEach((node) => node.classList.add("armed"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("in");
        }
      },
      { threshold: 0.08 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  function start() {
    if (name) navigate({ to: "/studio" });
    else navigate({ to: "/create-account" });
  }

  const links = [
    ["Home", "#top"],
    ["Subjects", "#subjects"],
    ["How it works", "#how"],
    ["Pricing", "#pricing"],
    ["FAQs", "#faqs"],
  ] as const;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <BrandMark />
          <nav className="hidden items-center gap-7 text-sm lg:flex" aria-label="Page">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="nav-link text-muted hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden text-sm text-muted hover:text-ink sm:inline">
              Sign in
            </Link>
            <button type="button" onClick={start} className="inline-flex min-h-11 items-center bg-primary px-4 text-sm font-semibold text-primary-fg">
              {name ? "Continue learning" : "Start free trial"}
            </button>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center border border-line lg:hidden"
              aria-expanded={menu}
              aria-controls="home-menu"
              aria-label={menu ? "Close menu" : "Open menu"}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav id="home-menu" className="menu-drop max-h-[70vh] overflow-auto border-t border-line bg-paper px-4 py-2 lg:hidden" aria-label="Page">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="flex min-h-11 items-center text-sm" onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section id="top" className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <div>
          <p className="rise text-sm font-medium tracking-wide text-brass">Science · JAMB · WAEC</p>
          <h1 className="rise rise-2 mt-3 font-display text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-7xl">
            Study one topic until it cannot surprise you.
          </h1>
          <WaveRule />
          <p className="rise rise-3 mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Physics, Chemistry, Biology, and Mathematics are open. A note, a diagram, then questions on that topic alone.
          </p>
          <div className="rise rise-4 mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={start} className="inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg">
              {name ? "Continue learning" : "Start free trial"}
            </button>
            <a href="#subjects" className="inline-flex min-h-11 items-center border border-ink px-5 text-sm font-semibold">
              Explore subjects
            </a>
          </div>
        </div>
        <figure className="rise rise-3 relative sm:mr-4 sm:mt-4">
          <div className="pointer-events-none absolute -top-4 right-0 hidden h-full w-[92%] border border-brass sm:block" aria-hidden />
          <div className="frame-photo relative">
            <img
              src="/media/atelier.jpg"
              alt="An open green book, a brass compass, and a drawn wave on warm paper"
              className="photo-in aspect-[5/4] w-full object-cover object-[72%_45%] sm:aspect-[4/3]"
            />
          </div>
          <figcaption className="mt-3 text-xs tracking-wide text-muted">One idea, drawn clearly, then practised.</figcaption>
        </figure>
      </section>

      <div className="overflow-hidden border-y border-line py-3" aria-hidden>
        <div className="marquee flex w-max gap-12 text-xs tracking-[0.22em] text-muted uppercase">
          {["Physics", "Chemistry", "Biology", "Mathematics", "Physics", "Chemistry", "Biology", "Mathematics"].map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
        </div>
      </div>

      <section className="reveal bg-ink text-primary-fg">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">
            Understand it. Practise it. Come back to the part that still slips.
          </h2>
          <p className="text-sm leading-relaxed text-primary-fg/75">
            Richmirabel keeps each subject in syllabus order. You finish a topic before the next one starts.
          </p>
        </div>
      </section>

      <section id="subjects" className="reveal mx-auto max-w-6xl px-4 py-16">
        <h2 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">The four science subjects are open now.</h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
          Start with the subject you need. Each topic has a note, a quick diagram, and a short practice set built for revision.
        </p>
        {science[0] && (
          <Link to="/studio/subject/$id" params={{ id: science[0].id }} className="press mt-8 grid overflow-hidden bg-surface md:grid-cols-[1.2fr_0.8fr]">
            <div className="frame-photo">
              <img src={photoOf(science[0])} alt="" className="photo aspect-[16/10] w-full object-cover md:aspect-auto md:h-full md:min-h-64" />
            </div>
            <div className="flex flex-col justify-end p-6">
              <p className="text-xs font-semibold tracking-wide text-primary">Available now</p>
              <h3 className="mt-2 font-display text-4xl">{science[0].name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{science[0].blurb}</p>
              <p className="mt-6 text-sm">{plural(science[0].topics.length, "topic")} · Start here</p>
            </div>
          </Link>
        )}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {science.map((subject) => (
            <li key={subject.id} className="border border-line bg-surface p-4">
              <p className="font-display text-xl">{subject.name}</p>
              <p className="mt-1 text-sm text-muted">Open now</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">Study with understanding. Practise with purpose.</h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            Work through one topic properly, then answer questions on that topic. Not a mixed pile you hope will stick.
          </p>
          <div className="mt-10 grid gap-4 lg:grid-cols-6">
            <article className="relative overflow-hidden bg-ink p-8 text-primary-fg lg:col-span-4 lg:row-span-2">
              <svg viewBox="0 0 280 48" className="mb-8 h-8 w-40" aria-hidden>
                <path d="M4 28 C 40 8, 70 44, 110 24 S 180 8, 220 26 270 40, 276 18" fill="none" stroke="#a6843d" strokeWidth="1.6" />
              </svg>
              <h3 className="font-display text-3xl sm:text-4xl">Understand it before you move on</h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-fg/80">
                Pick one topic. Read the note. Sit the short set that belongs to it. The next topic waits until this one is no longer a surprise.
              </p>
            </article>
            <article className="bg-surface p-6 lg:col-span-2">
              <h3 className="font-display text-2xl">Clear explanations, less confusion</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">Notes are written in plain language, with a formula or a diagram only when the idea needs one. They are supplied and reviewed, not generated on the spot.</p>
            </article>
            <article className="bg-soft p-6 lg:col-span-2">
              <h3 className="font-display text-2xl">Practise what you've just learnt</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">Each set stays on the topic you just read. It is a short CBT-style practice, not a copy of the official JAMB screen.</p>
            </article>
            <article className="border border-line bg-paper p-6 lg:col-span-3">
              <h3 className="font-display text-2xl">Every mistake can teach you something</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">After you submit, each question shows the answer and a short explanation, so a miss has a reason you can reread.</p>
            </article>
            <article className="bg-surface p-6 lg:col-span-3">
              <h3 className="font-display text-2xl">See how far you've come</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">Progress keeps the best score for each topic you have sat. It lives on this device. It does not follow you to another phone.</p>
            </article>
            <article className="border-t-2 border-brass bg-surface p-6 lg:col-span-6">
              <h3 className="font-display text-2xl">Your subjects. Your pace. Your next step.</h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Open the subject you need, stay on the topic that is still weak, and leave the rest. There is no automatic study plan deciding the order for you.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="how" className="reveal border-y border-line">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-4xl">Four moves</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              ["01", "Choose", "A subject, then one topic."],
              ["02", "Read", "A short note and a diagram when the idea needs one."],
              ["03", "Practise", "A CBT-style set on that topic only."],
              ["04", "Return", "Your best score shows what to reopen."],
            ].map(([n, title, body]) => (
              <li key={n} className="border-t border-brass pt-4">
                <p className="font-display text-sm text-brass">{n}</p>
                <h3 className="mt-2 font-display text-3xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="reveal bg-soft">
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-brass">Two days, then the term</p>
            <p className="mt-3 font-display text-6xl sm:text-7xl">₦4,500</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              The trial starts when you enter your first name and lasts 48 hours. After that, notes stay open and practice waits for term access. Nothing here charges a card.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4">
            <p className="max-w-sm text-lg leading-snug">The subjects that are open now, their notes, the sets, the mark guides, and progress on this device.</p>
            <button type="button" onClick={start} className="inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg">
              {name ? "Continue learning" : "Start free trial"}
            </button>
          </div>
        </div>
      </section>

      <section id="faqs" className="reveal mx-auto max-w-3xl px-4 py-14">
        <h2 className="font-display text-4xl">Questions</h2>
        <div className="mt-6 border-t border-line">
          {faqs.map((item, index) => {
            const shown = faq === index;
            return (
              <div key={item.q} className="border-b border-line">
                <button type="button" className="flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left" aria-expanded={shown} onClick={() => setFaq(shown ? null : index)}>
                  <span>{item.q}</span>
                  <span aria-hidden className="text-brass">{shown ? "–" : "+"}</span>
                </button>
                {shown && <p className="faq-open pb-4 text-sm leading-relaxed text-muted">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink text-primary-fg">
        <img src="/media/atelier.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-lg font-display text-4xl sm:text-5xl">Begin with the topic that has been bothering you.</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={start} className="inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg">
              {name ? "Continue learning" : "Start free trial"}
            </button>
            <a href="#subjects" className="inline-flex min-h-11 items-center border border-primary-fg/40 px-5 text-sm font-semibold">
              Explore subjects
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <BrandMark />
          <div className="text-sm">
            <a href="#subjects" className="block min-h-11 text-muted sm:min-h-0">Subjects</a>
            <a href="#how" className="block min-h-11 text-muted sm:min-h-0">How it works</a>
            <a href="#pricing" className="block min-h-11 text-muted sm:min-h-0">Pricing</a>
            <a href="#faqs" className="block min-h-11 text-muted sm:min-h-0">FAQs</a>
          </div>
          <div className="text-sm">
            <Link to="/studio" className="block min-h-11 text-muted sm:min-h-0">Dashboard</Link>
            <Link to="/studio/guides" className="block min-h-11 text-muted sm:min-h-0">Guides</Link>
            <Link to="/studio/progress" className="block min-h-11 text-muted sm:min-h-0">Scores</Link>
            <Link to="/studio/plan" className="block min-h-11 text-muted sm:min-h-0">Plan</Link>
          </div>
        </div>
        <p className="px-4 pb-6 text-xs text-muted">© 2026 Richmirabel</p>
      </footer>
    </div>
  );
}
