import React, {useState} from "react"
import type { ChangeEvent } from "react"



interface LandingProps {
    onStartClick: () => void
}


const Landing: React.FC<LandingProps> = ({ onStartClick }) => {
    

    

    
    
    return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
       
        {/* Landing Page */}
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
       
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
              onClick={ onStartClick } 
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-xl transition shadow-lg shadow-purple-500/25"
            >
              Get Started →
            </button>
          </div>
         
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

export {
    Landing
}