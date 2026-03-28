const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

const ACCESS_SECRET = "access_secret_key";
const REFRESH_SECRET = "refresh_secret_key";

app.use(cors());
app.use(express.json());

// ==== Swagger setup ====
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Products API RBAC",
      version: "2.0.0",
      description: `
## API интернет-магазина с системой ролей (RBAC)

### Роли пользователей:
- **Гость** — не аутентифицированный пользователь (регистрация, вход)
- **Пользователь (user)** — только просмотр товаров
- **Продавец (seller)** — добавление и редактирование товаров
- **Администратор (admin)** — права продавца + управление пользователями

### Аутентификация:
Используется JWT Bearer Token. После входа скопируйте \`accessToken\` и вставьте в кнопку **Authorize** вверху страницы.
      `
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Введите accessToken, полученный при входе (/api/auth/login)"
        }
      }
    }
  },
  apis: ["./app.js"]
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(swaggerOptions)));

// ==== Data ====
let users = [];
let refreshTokens = [];
let products = [
  { id: nanoid(6), title: "iPhone 15", category: "Смартфоны", description: "Apple смартфон", price: 90000, image: "" },
  { id: nanoid(6), title: "Samsung S23", category: "Смартфоны", description: "Android смартфон", price: 75000, image: "" }
];

// ==== Auth Middleware ====
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token required" });
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ==== Role Middleware ====
function roleMiddleware(roles = []) {
  return (req, res, next) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isBlocked) return res.status(403).json({ error: "User blocked" });
    if (!roles.includes(user.role)) return res.status(403).json({ error: "Access denied" });
    req.currentUser = user;
    next();
  };
}

// ======================
// Swagger Schemas
// ======================
/**
 * @swagger
 * components:
 *   schemas:
 *     AuthTokens:
 *       type: object
 *       description: Пара токенов доступа и обновления
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT токен доступа (живёт 15 минут)
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           description: JWT токен обновления (живёт 7 дней)
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         first_name:
 *           type: string
 *           example: Иван
 *         last_name:
 *           type: string
 *           example: Иванов
 *         password:
 *           type: string
 *           format: password
 *           example: "secret123"
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: "secret123"
 *
 *     RefreshRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh-токен, полученный при входе
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *     User:
 *       type: object
 *       description: Объект пользователя
 *       properties:
 *         id:
 *           type: string
 *           example: abc123
 *         email:
 *           type: string
 *           example: user@example.com
 *         first_name:
 *           type: string
 *           example: Иван
 *         last_name:
 *           type: string
 *           example: Иванов
 *         role:
 *           type: string
 *           enum: [user, seller, admin]
 *           example: user
 *         isBlocked:
 *           type: boolean
 *           example: false
 *
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [user, seller, admin]
 *           description: Новая роль пользователя
 *           example: seller
 *
 *     Product:
 *       type: object
 *       description: Объект товара
 *       properties:
 *         id:
 *           type: string
 *           example: xyz789
 *         title:
 *           type: string
 *           example: iPhone 15
 *         category:
 *           type: string
 *           example: Смартфоны
 *         description:
 *           type: string
 *           example: Apple смартфон последнего поколения
 *         price:
 *           type: number
 *           example: 90000
 *         image:
 *           type: string
 *           example: https://example.com/image.jpg
 *
 *     ProductRequest:
 *       type: object
 *       required:
 *         - title
 *         - category
 *         - price
 *       properties:
 *         title:
 *           type: string
 *           example: iPhone 15
 *         category:
 *           type: string
 *           example: Смартфоны
 *         description:
 *           type: string
 *           example: Apple смартфон последнего поколения
 *         price:
 *           type: number
 *           example: 90000
 *         image:
 *           type: string
 *           example: https://example.com/image.jpg
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Описание ошибки
 *
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Операция выполнена успешно
 */

// ======================
// AUTH ROUTES
// ======================

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Аутентификация и управление сессией
 *   - name: Users
 *     description: Управление пользователями (только Администратор)
 *   - name: Products
 *     description: Управление товарами
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     description: Доступно всем (Гость). Создаёт нового пользователя с ролью `user`.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Email и пароль обязательны
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email и пароль обязательны" });

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({
    id: nanoid(6),
    email,
    first_name: first_name || "",
    last_name: last_name || "",
    password: hashedPassword,
    role: "user",
    isBlocked: false
  });

  res.status(201).json({ message: "Пользователь зарегистрирован" });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Доступно всем (Гость). Возвращает пару JWT токенов — `accessToken` (15 мин) и `refreshToken` (7 дней).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешный вход, токены выданы
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Неверный email или пароль
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Пользователь заблокирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: "Неверные данные" });

  if (user.isBlocked)
    return res.status(403).json({ error: "Пользователь заблокирован" });

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });

  refreshTokens.push(refreshToken);

  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     description: Доступно всем (Гость). Принимает действующий `refreshToken` и возвращает новую пару токенов. Старый refresh-токен при этом аннулируется.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Новая пара токенов успешно выдана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: refreshToken не передан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Токен недействителен или истёк
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken)
    return res.status(400).json({ error: "refreshToken обязателен" });

  if (!refreshTokens.includes(refreshToken))
    return res.status(401).json({ error: "Недействительный refresh-токен" });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find(u => u.id === payload.id);

    if (!user)
      return res.status(404).json({ error: "Пользователь не найден" });

    // Аннулируем старый refresh-токен
    refreshTokens = refreshTokens.filter(t => t !== refreshToken);

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });

    refreshTokens.push(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ error: "Токен недействителен или истёк" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить текущего пользователя
 *     description: Доступно аутентифицированным пользователям (user, seller, admin). Возвращает данные о текущем пользователе на основе переданного токена.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные текущего пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав доступа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/auth/me",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    res.json(user);
  }
);

// ======================
// USERS (ADMIN)
// ======================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список всех пользователей
 *     description: Доступно только **Администратору**. Возвращает массив всех зарегистрированных пользователей.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => res.json(users)
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID
 *     description: Доступно только **Администратору**.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Уникальный идентификатор пользователя
 *         schema:
 *           type: string
 *           example: abc123
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(user);
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя
 *     description: Доступно только **Администратору**. Позволяет изменить роль пользователя.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Уникальный идентификатор пользователя
 *         schema:
 *           type: string
 *           example: abc123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Пользователь успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.put("/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    const { role } = req.body;
    if (role) user.role = role;
    res.json(user);
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя
 *     description: Доступно только **Администратору**. Устанавливает флаг `isBlocked = true`. Заблокированный пользователь не сможет войти в систему.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Уникальный идентификатор пользователя
 *         schema:
 *           type: string
 *           example: abc123
 *     responses:
 *       200:
 *         description: Пользователь заблокирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete("/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    user.isBlocked = true;
    res.json({ message: "User blocked" });
  }
);

// ======================
// PRODUCTS
// ======================

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     description: Доступно аутентифицированным пользователям (user, seller, admin).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/products",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => res.json(products)
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     description: Доступно аутентифицированным пользователям (user, seller, admin).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Уникальный идентификатор товара
 *         schema:
 *           type: string
 *           example: xyz789
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/products/:id",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.json(product);
  }
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     description: Доступно **Продавцу** и **Администратору**.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductRequest'
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль seller или admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/api/products",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const newProduct = { id: nanoid(6), ...req.body };
    products.push(newProduct);
    res.status(201).json(newProduct);
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить параметры товара
 *     description: Доступно **Продавцу** и **Администратору**.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Уникальный идентификатор товара
 *         schema:
 *           type: string
 *           example: xyz789
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductRequest'
 *     responses:
 *       200:
 *         description: Товар успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль seller или admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Товар не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.put("/api/products/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    Object.assign(product, req.body);
    res.json(product);
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     description: Доступно только **Администратору**.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Уникальный идентификатор товара
 *         schema:
 *           type: string
 *           example: xyz789
 *     responses:
 *       204:
 *         description: Товар успешно удалён (тело ответа пустое)
 *       401:
 *         description: Токен не передан или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав (требуется роль admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete("/api/products/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.status(204).send();
  }
);

// ======================
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));