import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black text-white overflow-hidden">
      {/* Film grain overlay */}
      <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Vignette */}
      <div className="pointer-events-none fixed inset-0 z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)'
        }}
      />

      {/* Horizontal lines decoration */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)',
        }}
      />

      {/* Content */}
      <div className="relative z-20 text-center max-w-2xl px-6">
        {/* Film strip top decoration */}
        <div className="flex items-center justify-center gap-2 mb-12 opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-4 h-3 border border-white rounded-sm" />
          ))}
        </div>

        <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-4">
          A film for finding people
        </p>

        <h1
          className="text-7xl md:text-9xl font-black mb-6 leading-none tracking-tighter"
          style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.04em' }}
        >
          Dissolve
        </h1>

        <p className="text-gray-400 text-lg mb-12 leading-relaxed max-w-md mx-auto">
          Match with people who see the world<br />the way you do.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="bg-white text-black px-8 py-3 text-sm uppercase tracking-widest font-bold hover:bg-gray-200 transition"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="border border-gray-600 text-gray-300 px-8 py-3 text-sm uppercase tracking-widest font-bold hover:border-white hover:text-white transition"
          >
            Sign In
          </Link>
        </div>

        {/* Film strip bottom decoration */}
        <div className="flex items-center justify-center gap-2 mt-12 opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-4 h-3 border border-white rounded-sm" />
          ))}
        </div>
      </div>
    </main>
  )
}