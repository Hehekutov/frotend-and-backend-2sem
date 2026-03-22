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
    info: { title: "Products API RBAC", version: "2.0.0", description: "API интернет-магазина с ролями" },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
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
  try { req.user = jwt.verify(token, ACCESS_SECRET); next(); }
  catch { return res.status(401).json({ error: "Invalid token" }); }
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
 *       properties:
 *         accessToken: { type: string }
 *         refreshToken: { type: string }
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         email: { type: string }
 *         role: { type: string, example: user }
 *         isBlocked: { type: boolean }
 *     Product:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         title: { type: string }
 *         category: { type: string }
 *         description: { type: string }
 *         price: { type: number }
 *         image: { type: string }
 */

// ======================
// AUTH ROUTES
// ======================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя (Гость)
 *     tags: [Auth]
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
 *     summary: Вход (Гость)
 *     tags: [Auth]
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
 * /api/auth/me:
 *   get:
 *     summary: Получить текущего пользователя (User+)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Получить список пользователей (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Получить пользователя по ID (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.get("/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    res.json(user);
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить пользователя (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.put("/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    const { role } = req.body;
    if (role) user.role = role;
    res.json(user);
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
app.delete("/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const user = users.find(u => u.id === req.params.id);
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
 *     summary: Получить список товаров (User+)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Получить товар по ID (User+)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.get("/api/products/:id",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    res.json(product);
  }
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар (Seller+)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Обновить товар (Seller+)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
app.put("/api/products/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    Object.assign(product, req.body);
    res.json(product);
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар (Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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