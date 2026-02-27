import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css"; // создадим стили

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    stock: "",
    image: ""
  });
  const [editId, setEditId] = useState(null);

  // Получаем все товары
  const fetchProducts = () => {
    api.get("/products").then(res => setProducts(res.data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAdd = () => {
    if (!form.name || !form.category) return alert("Заполните все поля");
    api.post("/products", form).then(() => {
      setForm({ name: "", category: "", description: "", price: "", stock: "", image: "" });
      fetchProducts();
    });
  };

  const handleUpdate = () => {
    api.patch(`/products/${editId}`, form).then(() => {
      setForm({ name: "", category: "", description: "", price: "", stock: "", image: "" });
      setEditId(null);
      fetchProducts();
    });
  };

  const handleDelete = (id) => {
    api.delete(`/products/${id}`).then(fetchProducts);
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image || ""
    });
  };

  return (
    <div className="container">
      <h1>Интернет-магазин электроники</h1>

      <div className="form-container">
        <h2>{editId ? "Редактировать товар" : "Добавить товар"}</h2>
        <input placeholder="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Категория" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
        <input placeholder="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Цена" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        <input placeholder="На складе" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
        <input placeholder="Ссылка на фото" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
        <div className="form-buttons">
          <button onClick={editId ? handleUpdate : handleAdd}>{editId ? "Сохранить" : "Добавить"}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: "", category: "", description: "", price: "", stock: "", image: "" }) }}>Отмена</button>}
        </div>
      </div>

      <h2>Товары</h2>
      <div className="products-grid">
        {products.map(p => (
          <div key={p.id} className="card">
            {p.image && <img src={p.image} alt={p.name} className="card-image" />}
            <div className="card-body">
              <h3>{p.name}</h3>
              <p className="category">{p.category}</p>
              <p>{p.description}</p>
              <p>Цена: <b>{p.price} ₽</b></p>
              <p>На складе: {p.stock}</p>
              <div className="card-buttons">
                <button onClick={() => handleEdit(p)}>Редактировать</button>
                <button onClick={() => handleDelete(p.id)}>Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;