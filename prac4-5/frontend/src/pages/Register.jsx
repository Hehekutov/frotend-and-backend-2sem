import { useState } from "react";

export default function Register({ onRegister, switchPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await onRegister(email, password, first_name, last_name); }
    catch { alert("Ошибка регистрации"); }
  };

  return (
    <div className="form-container">
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <input placeholder="Имя" value={first_name} onChange={e => setFirstName(e.target.value)} />
        <input placeholder="Фамилия" value={last_name} onChange={e => setLastName(e.target.value)} />
        <button type="submit">Зарегистрироваться</button>
      </form>
      <p>Уже есть аккаунт? <span onClick={switchPage} style={{ cursor: "pointer", color: "blue" }}>Войти</span></p>
    </div>
  );
}