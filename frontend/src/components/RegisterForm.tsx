import React, { useState } from "react";
import type { ChangeEvent } from 'react';

const RegisterForm: React.FC = () => {
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [repeatPassword, setReapeatPassword] = useState<string>("")

    //Typowanie zdarzenia zmiany inputa
    const handleChange = (e: ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(e.target.value)
    }

    //Typowanie zdarzenia wysyłki arkusza
    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        if (password !== repeatPassword) {
            alert("Hasła nie są identyczne")
            return
        }

        console.log("TSX Log: Wysyłka danych", {email, password})
        //tutaj bedzie logika rejestracji

    }

    return (
        <div>
            <h2>Zarejestruj się</h2>
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
                    onChange={(e)=> handleChange(e, setPassword)}
                />
                <input 
                    type="password"
                    placeholder="Powtórz hasło"
                    required
                    onChange={(e) => handleChange(e, setReapeatPassword)}
                />
                <button type="submit">
                    Utwórz konto
                </button>
            </form>
        </div>
    )
}

export {RegisterForm}