import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Products from "./pages/Products";

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login"); // login / register / products

  // Проверяем токен при загрузке
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
    setPage("login");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setPage("login");
  };

  return (
    <div className="container">
      <header>
        {user && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2>Привет, {user.first_name || user.email}</h2>
            <button onClick={handleLogout}>Выйти</button>
          </div>
        )}
      </header>

      {page === "login" && <Login onLogin={handleLogin} switchPage={() => setPage("register")} />}
      {page === "register" && <Register onRegister={handleRegister} switchPage={() => setPage("login")} />}
      {page === "products" && <Products user={user} />}
    </div>
  );
}

export default App;