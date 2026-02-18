import { useEffect, useState } from 'react'
import { Landing } from './components/Landing.tsx'
import { LogginForm } from './components/LogginForm.tsx'
import { RegisterForm } from './components/RegisterForm.tsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard.tsx'
import axios from 'axios'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false) 
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false)

  const handleOpenLoginModal = () => {
    setIsLoginModalOpen(true)
   }

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false)
  }

  const handleOpenRegisterModal = () => {
    setRegisterModalOpen(true)
    setIsLoginModalOpen(false)
  }

  const handleCloseRegisterModal = () => {
    setRegisterModalOpen(false)
  }

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          const response = await axios.post(
            "http://localhost:3001/api/auth/verify",
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`
              },
            }
          )
          console.log(response);
          
          if (response.status === 200) {
            setIsLoggedIn(true)
          }
        } catch (error) {
          console.error("Błąd weryfikacji tokenu:", error)
          localStorage.removeItem("token")
          setIsLoggedIn(false) 
        }
      }
    }
    verifyToken()
  },[])

  //dodac 3 stan zeby usunąć pol sekundowe wylogowanie
  //dodac ochrone sciezek jak niezalogowany powrot na landing
  //ustawic auto-logout
  //xmienic w api zeby dane pobierały sie z bazy a nie z tokena
  //logika dla sprawdzenia roli uzytkownika
  

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Page */}
          <Route
            path="/"
            element={
              <>
                <Landing onStartClick={handleOpenLoginModal} />
                {isLoginModalOpen && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
                      <button
                        onClick={handleCloseLoginModal}
                        className="absolute top-4 left-20 text-gray-500 hover:text-gray-800"
                      >
                        X
                      </button>
                      <h2 className="text-xl font-bold mb-4">Zaloguj się</h2>
                      <LogginForm setIsLoggedIn={setIsLoggedIn}/>
                      <button onClick={handleOpenRegisterModal}>
                        Zarejestruj się
                      </button>
                    </div>
                  </div>
                )}
                {isRegisterModalOpen && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
                      <button
                        onClick={handleCloseRegisterModal}
                        className="absolute top-4 left-20 text-gray-500 hover:text-gray-800"
                      >
                        X
                      </button>
                      <h2 className="text-xl font-bold mb-4">Zarejestruj się</h2>
                      <RegisterForm />
                    </div>
                  </div>
                )}
              </>
            }
          />
          {/* Dashboard */}
          <Route path="/dashboard" element={
              isLoggedIn ? (
                <Dashboard />
              ) : (
                <div className="text-center mt-10">
                  <h2 className="text-2xl font-bold">Nie jesteś zalogowany!</h2>
                  <p>Proszę zalogować się, aby uzyskać dostęp do dashboardu.</p>
                </div>
              )
            } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
