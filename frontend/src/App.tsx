import { useState } from 'react'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧠</span>
            <h1 className="text-2xl font-bold text-white">The Brain App</h1>
          </div>
          <div className="flex gap-4">
            {!isLoggedIn ? (
              <>
                <button className="px-4 py-2 text-white/80 hover:text-white transition">
                  Login
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition">
                  Sign Up
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="px-4 py-2 text-white/80 hover:text-white transition"
              >
                Logout
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {!isLoggedIn ? (
          // Landing Page
          <div className="text-center max-w-5xl">
            <div className="mb-16">
              <h2 className="text-5xl font-bold text-white mb-6">
                Your Second Brain
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                An AI-powered memory system that mimics how your brain processes, 
                stores, and connects information. Let your thoughts evolve.
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
                <div className="text-4xl mb-4">👁️</div>
                <h3 className="text-xl font-semibold text-white mb-3">Consciousness</h3>
                <p className="text-white/60 leading-relaxed">
                  AI analyzes your entries, finds patterns, and creates semantic connections.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
                <div className="text-4xl mb-4">🌘</div>
                <h3 className="text-xl font-semibold text-white mb-3">Subconsciousness</h3>
                <p className="text-white/60 leading-relaxed">
                  Automatic memory decay and pruning. Keep what matters, forget what doesn't.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
                <div className="text-4xl mb-4">🔗</div>
                <h3 className="text-xl font-semibold text-white mb-3">Synapses</h3>
                <p className="text-white/60 leading-relaxed">
                  Neural connections between your memories. Strengthen through use.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setIsLoggedIn(true)}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-xl transition shadow-lg shadow-purple-500/25"
            >
              Get Started →
            </button>
          </div>
        ) : (
          // Dashboard Placeholder
          <div className="text-center w-full max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">
              Welcome to your Brain 🧠
            </h2>
            <p className="text-white/60 mb-8">Dashboard coming soon...</p>
            
            {/* Quick Stats Placeholder */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white">0</div>
                <div className="text-white/60 text-sm">Memories</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white">0</div>
                <div className="text-white/60 text-sm">Synapses</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white">0</div>
                <div className="text-white/60 text-sm">Long-term</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white">0</div>
                <div className="text-white/60 text-sm">Categories</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/40 text-sm">
          Built with 🧠 by greg00ry
        </div>
      </footer>
    </div>
  )
}

export default App
