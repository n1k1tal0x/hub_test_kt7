class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class PaymentFailedError extends AppError {
  constructor(message) {
    super(message, 402);
  }
}

module.exports = { AppError, NotFoundError, ValidationError, PaymentFailedError };
