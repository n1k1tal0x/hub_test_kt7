// Уровень интерфейса (interface layer): HTTP API поверх бизнес-логики.

const express = require('express');
const productService = require('../services/productService');
const orderService = require('../services/orderService');

const router = express.Router();

router.get('/products', (req, res) => {
  res.json(productService.listProducts());
});

router.get('/products/:id', (req, res, next) => {
  try {
    const product = productService.getProduct(Number(req.params.id));
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/orders', async (req, res, next) => {
  try {
    const { items, promoCode } = req.body;
    const order = await orderService.createOrder({ items, promoCode });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', (req, res, next) => {
  try {
    const order = orderService.getOrder(Number(req.params.id));
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
