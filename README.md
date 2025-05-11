# E-Commerce API

Backend REST API for the E-Commerce platform.

## Overview

This API powers the E-Commerce platform with RESTful endpoints for products, users, orders, and image uploads. It uses JWT authentication for secure access and Cloudinary for permanent image storage.

**Live Demo API**: [https://web-production-52db.up.railway.app/](https://web-production-52db.up.railway.app/)

**Frontend Repository**: [E-Commerce UI](https://github.com/yuhao0308/ecommerce-ui)

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Cloudinary for image storage
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Cloudinary account

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
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
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
  - Note: Images are stored in Cloudinary and URLs are permanent

## Image Storage

The application uses Cloudinary for image storage, which provides:
- Permanent cloud storage for images
- Global CDN for fast image delivery
- Automatic image optimization
- Free tier includes:
  - 25 credits/month
  - 25GB storage
  - 25GB bandwidth
  - Basic transformations

### Cloudinary Configuration

Images are stored with the following configuration:
- Folder: 'ecommerce'
- Allowed formats: jpg, jpeg, png, gif
- Automatic optimization:
  - Max dimensions: 1000x1000
  - Quality: auto
  - Format: auto

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
4. Set up environment variables:
   ```
   PORT=4000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
5. Deploy

## License

MIT License 