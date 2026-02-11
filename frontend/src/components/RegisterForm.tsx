


function RegisterForm() {
    return (
        <div>
            <form action="/register" method="post">
                Podaj adres email: <input type="text" />
                Podaj hasło: <input type="password" />
                Powtórz hasło: <input type="password" />
                <button type="submit">Zarejestruj się</button>
            </form>
        </div>
    )
}