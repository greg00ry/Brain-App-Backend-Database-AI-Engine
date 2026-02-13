import React, {useState, type ChangeEvent} from "react"
import axios from "axios"
import { useSubmit } from "react-router-dom"



const LogginForm: React.FC = () => {
   
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [error, setError] = useState<string | null>("")

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
            //obsluga logowania
            //
            //
            //

            localStorage.setItem("token", response.data.token)
            alert("Zalogowano pomyślnie!")


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
        </div>
    )
}

export {
    LogginForm
}