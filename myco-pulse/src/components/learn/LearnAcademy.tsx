import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { fetchPulseLearn, type PulseLearnModule } from "../../lib/pulseApi";
import { useQueryParam, writeQuery } from "../../lib/spaQuery";
import { LessonMarkdown } from "./LessonMarkdown";

const PROGRESS_KEY = "mycodao.learn.completed.v1";

interface Course {
  name: string;
  order: number;
  lessons: PulseLearnModule[];
}

function readProgress(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function groupCourses(modules: PulseLearnModule[]): Course[] {
  const byName = new Map<string, Course>();
  for (const m of modules) {
    const name = m.course ?? "Lessons";
    const course = byName.get(name) ?? { name, order: m.courseOrder ?? 99, lessons: [] };
    course.lessons.push(m);
    byName.set(name, course);
  }
  return [...byName.values()]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ ...c, lessons: c.lessons.sort((a, b) => (a.lessonOrder ?? 0) - (b.lessonOrder ?? 0)) }));
}

/** MycoDAO Learn: ordered courses on the fungal economy, MYCO, discovery, FungIP and fungal products. */
export function LearnAcademy({ initialModules = [] }: { initialModules?: PulseLearnModule[] }) {
  const [modules, setModules] = useState<PulseLearnModule[]>(initialModules);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(() => readProgress());
  const [query, setQuery] = useState("");
  const lessonParam = useQueryParam("lesson");

  useEffect(() => {
    let active = true;
    fetchPulseLearn()
      .then((m) => active && m.length && setModules(m))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Lessons unavailable"));
    return () => {
      active = false;
    };
  }, []);

  const courses = useMemo(() => groupCourses(modules), [modules]);
  const ordered = useMemo(() => courses.flatMap((c) => c.lessons), [courses]);
  const active = ordered.find((m) => m.id === lessonParam) ?? ordered[0];
  const activeIndex = active ? ordered.indexOf(active) : -1;
  const q = query.trim().toLowerCase();
  const matches = (m: PulseLearnModule) =>
    !q || `${m.title} ${m.summary} ${m.tags.join(" ")} ${m.contentMd ?? ""}`.toLowerCase().includes(q);

  const open = (id: string) => writeQuery({ lesson: id }, "push");
  const toggleDone = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompleted(next);
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
  };

  if (error && !modules.length) return <p className="p-6 text-sm text-red-300">Lessons unavailable: {error}</p>;
  if (!active) return <p className="p-6 text-sm text-white/50">Loading lessons…</p>;

  const doneCount = ordered.filter((m) => completed.has(m.id)).length;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 border border-white/10 bg-black/40 lg:sticky lg:top-0 lg:w-80">
        <div className="border-b border-white/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-myco-accent">MycoDAO Learn</p>
          <p className="text-sm text-white/70">
            {ordered.length} lessons · {courses.length} courses · {doneCount} completed
          </p>
          <label className="mt-3 flex items-center gap-2 border border-white/10 px-3">
            <Search className="h-4 w-4 text-white/40" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lessons"
              className="h-11 w-full bg-transparent text-base text-white outline-none placeholder:text-white/30"
            />
          </label>
        </div>
        <nav aria-label="Courses" className="max-h-[45vh] overflow-y-auto lg:max-h-[70vh]">
          {courses.map((c, ci) => {
            const lessons = c.lessons.filter(matches);
            if (!lessons.length) return null;
            const done = c.lessons.filter((m) => completed.has(m.id)).length;
            return (
              <div key={c.name} className="border-b border-white/5 p-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-white">
                    {ci + 1}. {c.name}
                  </p>
                  <span className="text-[10px] text-white/40">{done}/{c.lessons.length}</span>
                </div>
                <div className="mb-2 h-1 bg-white/10">
                  <div className="h-1 bg-myco-accent" style={{ width: `${(done / c.lessons.length) * 100}%` }} />
                </div>
                <ul>
                  {lessons.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => open(m.id)}
                        className={cn(
                          "flex min-h-[44px] w-full items-center gap-2 px-2 text-left text-sm touch-manipulation",
                          m.id === active.id ? "bg-myco-accent/10 text-myco-accent" : "text-white/70 hover:text-white",
                        )}
                      >
                        {completed.has(m.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-myco-accent" /> : <Circle className="h-4 w-4 shrink-0 text-white/30" />}
                        <span className="flex-1">{m.title}</span>
                        <span className="text-[10px] text-white/35">{m.readingTimeMin}m</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <article className="min-w-0 flex-1 border border-white/10 bg-black/20 p-4 md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
          {active.course ?? "Lesson"} · {active.level} · {active.readingTimeMin} min read
        </p>
        <h2 className="mt-1 text-2xl md:text-4xl font-black uppercase leading-tight tracking-tight">{active.title}</h2>
        <p className="mt-2 text-base text-white/60">{active.summary}</p>
        <div className="mt-6 border-t border-white/10 pt-6">
          {active.contentMd ? <LessonMarkdown source={active.contentMd} /> : <p className="text-white/50">Lesson body not available.</p>}
        </div>
        {active.resourceLinks?.length ? (
          <div className="mt-8 border-t border-white/10 pt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest">Sources and further reading</p>
            <ul className="space-y-1">
              {active.resourceLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 text-sm text-myco-accent hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => toggleDone(active.id)}
            className={cn(
              "min-h-[44px] border px-4 text-xs font-bold uppercase tracking-widest",
              completed.has(active.id) ? "border-myco-accent text-myco-accent" : "border-white/20 text-white",
            )}
          >
            {completed.has(active.id) ? "Completed ✓" : "Mark lesson complete"}
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={activeIndex <= 0} onClick={() => open(ordered[activeIndex - 1].id)} className="inline-flex min-h-[44px] items-center gap-1 border border-white/10 px-3 text-xs font-bold uppercase tracking-widest disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button type="button" disabled={activeIndex >= ordered.length - 1} onClick={() => open(ordered[activeIndex + 1].id)} className="inline-flex min-h-[44px] items-center gap-1 border border-myco-accent px-3 text-xs font-bold uppercase tracking-widest text-myco-accent disabled:opacity-30">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
