// Слой доступа к данным (Data Access Layer).
// В учебных целях используется хранилище в памяти вместо реальной БД,
// но интерфейс спроектирован так, как будто это репозиторий над настоящей БД.

let products = [];
let nextId = 1;

function seed() {
  products = [
    { id: 1, title: 'Чистый код', author: 'Р. Мартин', price: 1200, stock: 5 },
    { id: 2, title: 'Совершенный код', author: 'С. Макконнелл', price: 1800, stock: 3 },
    { id: 3, title: 'Рефакторинг', author: 'М. Фаулер', price: 950, stock: 0 },
    { id: 4, title: 'Паттерны проектирования', author: 'GoF', price: 700, stock: 10 },
  ];
  nextId = products.length + 1;
}

seed();

function getAll() {
  return products.map((p) => ({ ...p }));
}

function getById(id) {
  const product = products.find((p) => p.id === id);
  return product ? { ...product } : null;
}

function decreaseStock(id, qty) {
  const product = products.find((p) => p.id === id);
  if (!product) return false;
  product.stock -= qty;
  return true;
}

function increaseStock(id, qty) {
  const product = products.find((p) => p.id === id);
  if (!product) return false;
  product.stock += qty;
  return true;
}

function reset() {
  seed();
}

module.exports = { getAll, getById, decreaseStock, increaseStock, reset };
