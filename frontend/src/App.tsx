import { useState } from 'react'
import { Landing } from './components/Landing.tsx'
import { LogginForm } from './components/LogginForm.tsx'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const handleOpenLoginModal = () => {
    setIsLoginModalOpen(true)
   }

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false)
  }

  return (
    <div className="App">
        <Landing onStartClick = { handleOpenLoginModal }/>
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
              <button
                  onClick={handleCloseLoginModal}
                  className='ansolute top-4 right-4 text-gray-500 hover:text-gray-800'
                >X</button>
                <h2 className='text-xl font-bold mb-4'>Zaloguj się</h2>
              <LogginForm/>
            </div>
          </div>
        )}
    </div>
  )
}

export default App
