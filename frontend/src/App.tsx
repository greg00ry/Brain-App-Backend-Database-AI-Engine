import { useEffect, useState } from 'react'
import { Landing } from './components/Landing.tsx'
import { LogginForm } from './components/LogginForm.tsx'
import { RegisterForm } from './components/RegisterForm.tsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard.tsx'
import { Navigate } from 'react-router-dom'
import axios from 'axios'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true) 
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
      const token = localStorage.getItem("token");
      if (!token) {
        setIsVerifying(false);
        return;
      }
      try {
        const response = await axios.post("http://localhost:3001/api/auth/verify", {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 200) setIsLoggedIn(true);
      } catch (error) {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      } finally {
        setIsVerifying(false); // Kończymy weryfikację niezależnie od wyniku
      }
    };
    verifyToken();
  }, []);

  if (isVerifying) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  //dodac 3 stan zeby usunąć pol sekundowe wylogowanie
  //dodac ochrone sciezek jak niezalogowany powrot na landing
  //ustawic auto-logout
  //xmienic w api zeby dane pobierały sie z bazy a nie z tokena
  //logika dla sprawdzenia roli uzytkownika
  

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Landing onStartClick={handleOpenLoginModal} />
          } />
          
          <Route path="/dashboard" element={
            isLoggedIn ? <Dashboard /> : <Navigate to="/" />
          } />
        </Routes>
        
          {/* Landing Page */}
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
      </div>
    </Router>
  )
}

export default App
