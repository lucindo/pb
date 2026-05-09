export default function App() {
  return (
    <main className="min-h-screen bg-[var(--color-breathing-bg)] px-6 py-10 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col items-center justify-center text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-teal-700">
          Phase 1
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
          HRV breathing timer
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
          A calm web app foundation for accurate, continuous inhale and exhale
          timing. Configurable session controls and the running guide will build
          on this shell.
        </p>
        <div className="mt-10 rounded-full border border-teal-200 bg-white/70 px-5 py-3 text-sm text-teal-900 shadow-sm">
          Default practice: 5.5 BPM · 40:60 · 10 minutes
        </div>
      </section>
    </main>
  )
}
