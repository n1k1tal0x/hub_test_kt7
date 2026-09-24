// Гибридные интеграционные тесты: интерфейс (HTTP API) + бизнес-логика +
// доступ к данным работают в связке, "сквозным" вызовом, без подмены
// внутренних слоёв. Единственное, что может подменяться -- внешние,
// ещё не реализованные модули (см. tests/integration/orders.hybrid.test.js).

const request = require('supertest');
const createApp = require('../../src/app');
const productRepository = require('../../src/data/productRepository');

describe('Товары: API -> бизнес-логика -> доступ к данным', () => {
  let app;

  beforeEach(() => {
    productRepository.reset();
    app = createApp();
  });

  test('позитивный сценарий: список товаров из API соответствует данным в репозитории', async () => {
    const res = await request(app).get('/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(productRepository.getAll().length);
    expect(res.body[0]).toMatchObject({ title: 'Чистый код', price: 1200 });
  });

  test('позитивный сценарий: получение товара по id возвращает актуальные данные из БД', async () => {
    const res = await request(app).get('/products/2');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, title: 'Совершенный код', stock: 3 });
  });

  test('негативный сценарий: запрос несуществующего товара -> 404 от API, ошибка пришла из бизнес-слоя', async () => {
    const res = await request(app).get('/products/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/не найден/i);
  });
});
