import React, {useState, type ChangeEvent} from "react"
import axios from "axios"



const LogginForm: React.FC = () => {
   
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")

    //Typowanie zdarzenia inputa
    const handleChange = (e: ChangeEvent<HTMLInputElement>,
         setter: React.Dispatch<React.SetStateAction<string>>) => {
            setter(e.target.value)
        }
    
    //Typowanie zdarzenia wysłki arkusza
    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        //logika logowania
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
            </form>
            <button type="submit">Zaloguj się</button>
        </div>
    )
}

export {
    LogginForm
}