import { useState } from "react";

export default function Login({ onLogin, switchPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await onLogin(email, password); }
    catch { alert("Ошибка входа"); }
  };

  return (
    <div className="form-container">
      <h2>Вход</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Войти</button>
      </form>
      <p>Нет аккаунта? <span onClick={switchPage} style={{ cursor: "pointer", color: "blue" }}>Зарегистрироваться</span></p>
    </div>
  );
}