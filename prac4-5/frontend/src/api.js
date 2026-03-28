import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" }
});

// Добавляем accessToken в каждый запрос
api.interceptors.request.use(config => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// При 401 пробуем обновить токен через refreshToken
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;

    // Если ошибка 401 и это не повторный запрос и не запрос на refresh/login
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url.includes("/auth/refresh") &&
      !original.url.includes("/auth/login")
    ) {
      original._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        // Нет refresh-токена — выкидываем пользователя
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.reload();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post("http://localhost:3000/api/auth/refresh", { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefresh);

        // Повторяем оригинальный запрос с новым токеном
        original.headers["Authorization"] = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        // Refresh тоже не сработал — разлогиниваем
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.reload();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;