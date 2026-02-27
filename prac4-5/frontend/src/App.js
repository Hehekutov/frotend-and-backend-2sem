import { useEffect, useState } from "react";
import { api } from "./api";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products").then(res => {
      setProducts(res.data);
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Интернет-магазин</h1>

      {products.map(p => (
        <div key={p.id} style={{ border: "1px solid gray", padding: 10, marginBottom: 10 }}>
          <h3>{p.name}</h3>
          <p>{p.category}</p>
          <p>{p.description}</p>
          <p>Цена: {p.price} ₽</p>
          <p>На складе: {p.stock}</p>
        </div>
      ))}
    </div>
  );
}

export default App;