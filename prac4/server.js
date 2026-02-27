const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();
const port = 3000;

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

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

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock } = req.body;
  const newProduct = {
    id: nanoid(6),
    name,
    category,
    description,
    price: Number(price),
    stock: Number(stock)
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.patch("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });

  Object.assign(product, req.body);
  res.json(product);
});

app.delete("/api/products/:id", (req, res) => {
  products = products.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});