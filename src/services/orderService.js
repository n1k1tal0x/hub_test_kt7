// Слой бизнес-логики: оформление заказов.
// Это самый критичный сценарий приложения -- он затрагивает все уровни:
// принимает данные из интерфейса (API), выполняет расчёты и проверки
// (бизнес-правила) и обращается к слою доступа к данным, а также к
// внешнему (пока не полностью реализованному) платёжному модулю.

const productRepository = require('../data/productRepository');
const orderRepository = require('../data/orderRepository');
const paymentGateway = require('../external/paymentGateway');
const { ValidationError, PaymentFailedError, NotFoundError } = require('../errors');
const productService = require('./productService');

const PROMO_CODES = {
  SALE10: { minSubtotal: 1000, rate: 0.1 },
};

function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function applyDiscount(subtotal, promoCode) {
  if (!promoCode) {
    return 0;
  }
  const promo = PROMO_CODES[promoCode];
  if (!promo) {
    throw new ValidationError(`Промокод "${promoCode}" не найден`);
  }
  if (subtotal < promo.minSubtotal) {
    throw new ValidationError(
      `Промокод "${promoCode}" применим при сумме заказа от ${promo.minSubtotal}`
    );
  }
  return subtotal * promo.rate;
}

async function createOrder({ items, promoCode }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Заказ должен содержать хотя бы одну позицию');
  }

  // Собираем полную информацию о товарах и проверяем наличие на складе.
  const orderItems = items.map(({ productId, qty }) => {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ValidationError('Количество товара должно быть положительным целым числом');
    }
    const product = productService.getProduct(productId);
    if (product.stock < qty) {
      throw new ValidationError(
        `Недостаточно товара "${product.title}" на складе (в наличии: ${product.stock})`
      );
    }
    return { productId, qty, price: product.price, title: product.title };
  });

  const subtotal = calculateSubtotal(orderItems);
  const discount = applyDiscount(subtotal, promoCode);
  const total = subtotal - discount;

  // Резервируем товар (списываем со склада) до подтверждения оплаты.
  orderItems.forEach((item) => productRepository.decreaseStock(item.productId, item.qty));

  const order = orderRepository.create({
    items: orderItems,
    subtotal,
    discount,
    total,
    promoCode: promoCode || null,
    status: 'pending',
  });

  const payment = await paymentGateway.charge(total);

  if (!payment.success) {
    // Откатываем резервирование склада, т.к. оплата не прошла.
    orderItems.forEach((item) => productRepository.increaseStock(item.productId, item.qty));
    orderRepository.updateStatus(order.id, 'failed');
    throw new PaymentFailedError('Оплата не прошла, заказ отменён');
  }

  const paidOrder = orderRepository.updateStatus(order.id, 'paid');
  return { ...paidOrder, transactionId: payment.transactionId };
}

function getOrder(id) {
  const order = orderRepository.getById(id);
  if (!order) {
    throw new NotFoundError(`Заказ с id=${id} не найден`);
  }
  return order;
}

module.exports = { createOrder, getOrder, calculateSubtotal, applyDiscount };
