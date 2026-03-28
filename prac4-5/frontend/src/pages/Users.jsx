import { useEffect, useState } from "react";
import api from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState("user");

  const fetchUsers = async () => {
    const res = await api.get("/users");
    setUsers(res.data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleEditStart = (user) => {
    setEditId(user.id);
    setEditRole(user.role);
  };

  const handleUpdate = async (id) => {
    await api.put(`/users/${id}`, { role: editRole });
    setEditId(null);
    fetchUsers();
  };

  const handleBlock = async (id) => {
    if (!window.confirm("Заблокировать пользователя?")) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const roleBadgeClass = (role) => {
    if (role === "admin") return "badge badge-admin";
    if (role === "seller") return "badge badge-seller";
    return "badge badge-user";
  };

  return (
    <div>
      <h2>Управление пользователями</h2>

      {users.length === 0 && (
        <p style={{ textAlign: "center", color: "#888" }}>Пользователей нет</p>
      )}

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Фамилия</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.isBlocked ? "row-blocked" : ""}>
                <td>{u.email}</td>
                <td>{u.first_name || "—"}</td>
                <td>{u.last_name || "—"}</td>
                <td>
                  {editId === u.id ? (
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="role-select"
                    >
                      <option value="user">user</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className={roleBadgeClass(u.role)}>{u.role}</span>
                  )}
                </td>
                <td>
                  <span className={u.isBlocked ? "badge badge-blocked" : "badge badge-active"}>
                    {u.isBlocked ? "Заблокирован" : "Активен"}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    {editId === u.id ? (
                      <>
                        <button className="btn-save" onClick={() => handleUpdate(u.id)}>Сохранить</button>
                        <button className="btn-cancel" onClick={() => setEditId(null)}>Отмена</button>
                      </>
                    ) : (
                      <>
                        {!u.isBlocked && (
                          <button className="btn-edit" onClick={() => handleEditStart(u)}>Изменить роль</button>
                        )}
                        {!u.isBlocked && (
                          <button className="btn-block" onClick={() => handleBlock(u.id)}>Заблокировать</button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}