import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="text-center max-w-xl px-6">
        <h1 className="text-6xl font-bold tracking-tight mb-4">Dissolve</h1>
        <p className="text-gray-400 text-xl mb-8">
          Match with people who see the world the way you do.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="border border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}