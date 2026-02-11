

function LogginForm() {
    return (
        <div>
            <form action="/login" method="post">
                Email: <input type="text" />
                Hasło: <input type="password" />
                <button type="submit">Login</button>
                <button>Register</button>
            </form>
        </div>
    )
}

export {
    LogginForm
}