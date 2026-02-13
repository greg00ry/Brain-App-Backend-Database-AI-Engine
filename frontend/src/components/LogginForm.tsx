import React, {useState, type ChangeEvent} from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

interface LogginFormProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
}

const LogginForm: React.FC<LogginFormProps> = ({ setIsLoggedIn }) => {
   
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [error, setError] = useState<string | null>("")

    const navigate = useNavigate()

    //Typowanie zdarzenia inputa
    const handleChange = (e: ChangeEvent<HTMLInputElement>,
         setter: React.Dispatch<React.SetStateAction<string>>) => {
            setter(e.target.value)
        }
    
    //Typowanie zdarzenia wysłki arkusza
    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)


        try{

            const response = await axios.post("http://localhost:3001/api/auth/login", {
                email,
                password
            })

            console.log("Login succesfull:", response.data)
            

            localStorage.setItem("token", response.data.token)
            alert("Zalogowano pomyślnie!")

            //aktualizacja stanu logowania
            setIsLoggedIn(true)
            //przekierowanie na dashboard

            
            navigate("/dashboard")
                

            console.log("/dashboard");

            
            

        } catch (err: any) {
            console.log("Login failed:", err)
            setError(err.response?.data?.message || "Wystąpił błąd podczas logowanie")
        }
    }
    
    
    return (
        

        <div>
            <form onSubmit={handleSubmit}>
                <input 
                type="email"
                placeholder="Email"
                required
                onChange={(e) => handleChange(e, setEmail)}
                />
                <input 
                type="password"
                placeholder="Hasło"
                required
                onChange={(e) => handleChange(e, setPassword)} 
                />
            <button type="submit">Zaloguj się</button>
            </form>
            {error && <p style={{color: "red"}}>{error}</p>}
        </div>
                
    )
}


export {
    LogginForm
}