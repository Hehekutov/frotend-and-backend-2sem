import { useEffect, useState } from "react";
import api from "../api";

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ title: "", category: "", description: "", price: "", image: "" });
  const [editId, setEditId] = useState(null);

  // Права по роли
  const canCreate = user?.role === "seller" || user?.role === "admin";
  const canEdit   = user?.role === "seller" || user?.role === "admin";
  const canDelete  = user?.role === "admin";

  const fetchProducts = async () => {
    const res = await api.get("/products");
    setProducts(res.data);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAdd = async () => {
    if (!form.title || !form.category) return alert("Заполните название и категорию");
    await api.post("/products", { ...form, price: Number(form.price) });
    setForm({ title: "", category: "", description: "", price: "", image: "" });
    fetchProducts();
  };

  const handleUpdate = async () => {
    await api.put(`/products/${editId}`, { ...form, price: Number(form.price) });
    setEditId(null);
    setForm({ title: "", category: "", description: "", price: "", image: "" });
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    await api.delete(`/products/${id}`);
    fetchProducts();
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setForm({
      title: product.title,
      category: product.category,
      description: product.description,
      price: product.price,
      image: product.image || ""
    });
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ title: "", category: "", description: "", price: "", image: "" });
  };

  return (
    <div>
      {/* Форма добавления/редактирования — только для seller и admin */}
      {canCreate && (
        <div className="form-container">
          <h2>{editId ? "Редактировать товар" : "Добавить товар"}</h2>
          <input
            placeholder="Название"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Категория"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          />
          <input
            placeholder="Описание"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <input
            placeholder="Цена"
            type="number"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
          />
          <input
            placeholder="Ссылка на фото"
            value={form.image}
            onChange={e => setForm({ ...form, image: e.target.value })}
          />
          <div className="form-buttons">
            <button onClick={editId ? handleUpdate : handleAdd}>
              {editId ? "Сохранить" : "Добавить"}
            </button>
            {editId && <button onClick={handleCancel}>Отмена</button>}
          </div>
        </div>
      )}

      <h2>Товары</h2>

      {products.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>Товаров пока нет</p>
      )}

      <div className="products-grid">
        {products.map(p => (
          <div key={p.id} className="card">
            {p.image && <img src={p.image} alt={p.title} className="card-image" />}
            <div className="card-body">
              <h3>{p.title}</h3>
              <p className="category">{p.category}</p>
              <p>{p.description}</p>
              <p>Цена: <b>{Number(p.price).toLocaleString("ru-RU")} ₽</b></p>

              {/* Кнопки управления — только для seller и admin */}
              {(canEdit || canDelete) && (
                <div className="card-buttons">
                  {canEdit && (
                    <button onClick={() => handleEdit(p)}>Редактировать</button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(p.id)}>Удалить</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}