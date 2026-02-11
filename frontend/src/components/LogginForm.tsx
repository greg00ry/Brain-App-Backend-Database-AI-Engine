

function LogginForm() {
    return (
        <div>
            <form action="/login" method="post">
                Nazwa uzytkownika: <input type="text" />
                Hasło: <input type="text" />
                <button type="submit">Login</button>
                <button>Register</button>
            </form>
        </div>
    )
}

export {
    LogginForm
}