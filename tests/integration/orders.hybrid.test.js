// Гибридные интеграционные тесты для самого критичного и часто
// используемого сценария приложения -- оформление заказа.
//
// Тест проходит "сквозь" все уровни приложения одним вызовом:
//   HTTP API (интерфейс) -> orderService (бизнес-логика) ->
//   productRepository / orderRepository (доступ к данным).
//
// Единственный подменённый (замоканный) элемент -- внешний платёжный
// шлюз (src/external/paymentGateway.js), т.к. на момент лабораторной
// работы он не имеет полноценной реализации (это заглушка). Такой
// подход соответствует рекомендации: "используйте моки или заглушки
// для модулей, которые ещё не завершены, чтобы не тормозить процесс
// тестирования", при этом сохраняя реальное взаимодействие между
// остальными уровнями приложения.

jest.mock('../../src/external/paymentGateway');

const request = require('supertest');
const createApp = require('../../src/app');
const productRepository = require('../../src/data/productRepository');
const orderRepository = require('../../src/data/orderRepository');
const paymentGateway = require('../../src/external/paymentGateway');

describe('Оформление заказа: API -> бизнес-логика -> доступ к данным', () => {
  let app;

  beforeEach(() => {
    productRepository.reset();
    orderRepository.reset();
    app = createApp();
    paymentGateway.charge.mockReset();
  });

  test('позитивный сценарий: успешная оплата -> заказ оплачен, склад списан', async () => {
    paymentGateway.charge.mockResolvedValue({ success: true, transactionId: 'TXN-TEST-1' });

    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 1, qty: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.total).toBe(2400);
    expect(paymentGateway.charge).toHaveBeenCalledWith(2400);

    // Проверяем, что бизнес-эффект действительно долетел до слоя данных.
    const product = productRepository.getById(1);
    expect(product.stock).toBe(3); // было 5, заказали 2
  });

  test('позитивный сценарий: промокод SALE10 корректно уменьшает сумму заказа при достаточной сумме', async () => {
    paymentGateway.charge.mockResolvedValue({ success: true, transactionId: 'TXN-TEST-2' });

    // 2 книги "Совершенный код" по 1800 = 3600, что больше порога в 1000.
    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 2, qty: 2 }], promoCode: 'SALE10' });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(3600);
    expect(res.body.discount).toBe(360);
    expect(res.body.total).toBe(3240);
    expect(paymentGateway.charge).toHaveBeenCalledWith(3240);
  });

  test('негативный сценарий: промокод не применяется при сумме ниже порога, склад не изменяется', async () => {
    // Товар с id=4 стоит 700, что ниже порога в 1000 для промокода SALE10.
    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 4, qty: 1 }], promoCode: 'SALE10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/применим при сумме заказа от/i);
    expect(productRepository.getById(4).stock).toBe(10); // склад не должен был измениться
    expect(paymentGateway.charge).not.toHaveBeenCalled();
  });

  test('негативный сценарий: неизвестный промокод отклоняется бизнес-логикой', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 1, qty: 1 }], promoCode: 'NOPE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/промокод/i);
  });

  test('негативный сценарий: недостаточно товара на складе -> 400, склад не меняется', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 3, qty: 1 }] }); // товар с id=3 имеет stock: 0

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/недостаточно/i);
    expect(productRepository.getById(3).stock).toBe(0);
    expect(paymentGateway.charge).not.toHaveBeenCalled();
  });

  test('негативный сценарий: заказ несуществующего товара -> 404, склад других товаров не затронут', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 999, qty: 1 }] });

    expect(res.status).toBe(404);
    expect(paymentGateway.charge).not.toHaveBeenCalled();
  });

  test('негативный сценарий: отрицательное количество товара должно отклоняться, а не пополнять склад', async () => {
    const before = productRepository.getById(1).stock;

    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 1, qty: -2 }] });

    expect(res.status).toBe(400);
    expect(productRepository.getById(1).stock).toBe(before);
  });

  test('негативный сценарий: отказ оплаты должен полностью откатывать резерв склада для ВСЕХ позиций заказа', async () => {
    paymentGateway.charge.mockResolvedValue({ success: false, transactionId: null });

    const stockBefore1 = productRepository.getById(1).stock;
    const stockBefore2 = productRepository.getById(2).stock;

    const res = await request(app)
      .post('/orders')
      .send({
        items: [
          { productId: 1, qty: 1 },
          { productId: 2, qty: 1 },
        ],
      });

    expect(res.status).toBe(402);

    const order = orderRepository.getAll()[0];
    expect(order.status).toBe('failed');

    // Склад должен вернуться к исходному состоянию для КАЖДОГО товара в заказе.
    expect(productRepository.getById(1).stock).toBe(stockBefore1);
    expect(productRepository.getById(2).stock).toBe(stockBefore2);
  });
});
