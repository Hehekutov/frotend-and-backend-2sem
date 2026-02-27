const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ==== Swagger ====
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Products API",
      version: "1.0.0",
      description: "CRUD API для интернет-магазина электроники"
    },
    servers: [
      { url: "http://localhost:3000" }
    ]
  },
  apis: ["./app.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==== Data ====
let products = [
  { id: nanoid(6), name: "iPhone 15", category: "Смартфоны", description: "Apple смартфон", price: 90000, stock: 10 },
  { id: nanoid(6), name: "Samsung S23", category: "Смартфоны", description: "Android смартфон", price: 75000, stock: 8 },
  { id: nanoid(6), name: "MacBook Air", category: "Ноутбуки", description: "Apple ноутбук", price: 120000, stock: 5 },
  { id: nanoid(6), name: "Lenovo ThinkPad", category: "Ноутбуки", description: "Рабочий ноутбук", price: 95000, stock: 7 },
  { id: nanoid(6), name: "iPad", category: "Планшеты", description: "Планшет Apple", price: 60000, stock: 12 },
  { id: nanoid(6), name: "AirPods", category: "Аксессуары", description: "Беспроводные наушники", price: 20000, stock: 20 },
  { id: nanoid(6), name: "Apple Watch", category: "Аксессуары", description: "Умные часы", price: 35000, stock: 15 },
  { id: nanoid(6), name: "PlayStation 5", category: "Консоли", description: "Игровая консоль", price: 65000, stock: 6 },
  { id: nanoid(6), name: "Xbox Series X", category: "Консоли", description: "Игровая консоль Microsoft", price: 60000, stock: 9 },
  { id: nanoid(6), name: "Dell Monitor", category: "Мониторы", description: "27 дюймов", price: 25000, stock: 14 }
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         stock:
 *           type: number
 */

// ==== GET all ====
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
  res.json(products);
});

// ==== POST create ====
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Добавить новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар добавлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock } = req.body;
  const newProduct = { id: nanoid(6), name, category, description, price: Number(price), stock: Number(stock) };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// ==== PATCH update ====
/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });
  Object.assign(product, req.body);
  res.json(product);
});

// ==== DELETE ====
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар удален
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Not found" });
  products.splice(index, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});