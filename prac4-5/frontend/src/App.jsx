import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Products from "./pages/Products";
import Users from "./pages/Users";

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login"); // login / register / products / users

  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      setPage("products");
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setPage("login");
    }
  };

  useEffect(() => { checkAuth(); }, []);

  const handleLogin = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    await checkAuth();
  };

  const handleRegister = async (email, password, first_name, last_name) => {
    await api.post("/auth/register", { email, password, first_name, last_name });
    alert("Регистрация успешна! Войдите в аккаунт.");
    setPage("login");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setPage("login");
  };

  const isLoggedIn = !!user;

  return (
    <div className="container">
      {/* Шапка — показываем только когда залогинен */}
      {isLoggedIn && (
        <header className="app-header">
          <div className="header-left">
            <span className="header-greeting">
              Привет, <b>{user.first_name || user.email}</b>
            </span>
            <span className={`badge badge-${user.role}`}>{user.role}</span>
          </div>

          <nav className="header-nav">
            <button
              className={page === "products" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("products")}
            >
              Товары
            </button>

            {/* Страница пользователей — только для admin */}
            {user.role === "admin" && (
              <button
                className={page === "users" ? "nav-btn active" : "nav-btn"}
                onClick={() => setPage("users")}
              >
                Пользователи
              </button>
            )}
          </nav>

          <button className="btn-logout" onClick={handleLogout}>Выйти</button>
        </header>
      )}

      {/* Страницы */}
      {page === "login" && (
        <Login onLogin={handleLogin} switchPage={() => setPage("register")} />
      )}
      {page === "register" && (
        <Register onRegister={handleRegister} switchPage={() => setPage("login")} />
      )}
      {page === "products" && isLoggedIn && (
        <Products user={user} />
      )}
      {page === "users" && user?.role === "admin" && (
        <Users />
      )}
    </div>
  );
}

export default App;