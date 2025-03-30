# E-Commerce API

Backend REST API for the E-Commerce platform.

## Overview

This API powers the E-Commerce platform with RESTful endpoints for products, users, orders, and image uploads. It uses JWT authentication for secure access.

**Live Demo API**: [https://web-production-52db.up.railway.app/](https://web-production-52db.up.railway.app/)

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ecommerce-api
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/e-commerce
JWT_SECRET=your_jwt_secret
```

4. Run the application
```bash
npm start
```

The API will be available at `http://localhost:4000`.

## API Documentation

### Authentication Endpoints

- `POST /login` - User login
  - Request body: `{ email, password }`
  - Response: `{ success, token, userId }`

- `POST /signup` - User registration
  - Request body: `{ name, email, password }`
  - Response: `{ success, userId }`

### Product Endpoints

- `GET /products` - Get all products
  - Query parameters: `category` (optional), `limit` (optional), `page` (optional)
  - Response: `{ success, products, total, totalPages }`

- `GET /products/:id` - Get a specific product
  - Response: `{ success, product }`

- `POST /products` - Create a new product (admin only)
  - Request body: `{ name, image, category, new_price, old_price }`
  - Response: `{ success, product }`

- `PUT /products/:id` - Update a product (admin only)
  - Request body: `{ name, image, category, new_price, old_price, available }`
  - Response: `{ success, product }`

- `DELETE /products/:id` - Delete a product (admin only)
  - Response: `{ success, message }`

### Order Endpoints

- `GET /orders` - Get user orders
  - Request header: `Authorization: Bearer <token>`
  - Response: `{ success, orders }`

- `POST /orders` - Create a new order
  - Request header: `Authorization: Bearer <token>`
  - Request body: `{ products, total, shipping_address, payment_method }`
  - Response: `{ success, order }`

- `GET /orders/:id` - Get order details
  - Request header: `Authorization: Bearer <token>`
  - Response: `{ success, order }`

### Image Upload

- `POST /images` - Upload product images
  - Request: `multipart/form-data` with field `image`
  - Response: `{ success, image_url }`

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Deployment

The API is deployed on Railway. For deployment:

1. Create a Railway account
2. Create a new project
3. Connect your GitHub repository
4. Set up environment variables
5. Deploy

## License

MIT License 