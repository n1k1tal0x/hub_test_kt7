// Слой доступа к данным: хранение заказов.

let orders = [];
let nextId = 1;

function create(order) {
  const record = { id: nextId++, ...order, createdAt: new Date().toISOString() };
  orders.push(record);
  return { ...record };
}

function getById(id) {
  const order = orders.find((o) => o.id === id);
  return order ? { ...order } : null;
}

function updateStatus(id, status) {
  const order = orders.find((o) => o.id === id);
  if (!order) return null;
  order.status = status;
  return { ...order };
}

function getAll() {
  return orders.map((o) => ({ ...o }));
}

function reset() {
  orders = [];
  nextId = 1;
}

module.exports = { create, getById, updateStatus, getAll, reset };
