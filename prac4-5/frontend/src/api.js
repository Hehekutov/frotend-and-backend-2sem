import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

// Интерцептор для автоматического добавления accessToken в заголовки
api.interceptors.request.use(config => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Интерцептор для обновления токена при 401 (необязательно, можно расширить)
export default api;