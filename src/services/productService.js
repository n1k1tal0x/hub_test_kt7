// Слой бизнес-логики: товары.

const productRepository = require('../data/productRepository');
const { NotFoundError } = require('../errors');

function listProducts() {
  return productRepository.getAll();
}

function getProduct(id) {
  const product = productRepository.getById(id);
  if (!product) {
    throw new NotFoundError(`Товар с id=${id} не найден`);
  }
  return product;
}

module.exports = { listProducts, getProduct };
