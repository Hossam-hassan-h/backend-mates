# Fruit & Vegetable E-Commerce Store - REST API Documentation

This backend is a specialized E-Commerce API configured for a Fruit & Vegetable Store, integrated with generic E-Commerce features (wishlist, coupons, customer addresses, brands, subcategories, product reviews).

## Base URL
`http://localhost:3000/api/v1`

---

## Table of Contents
1. [Authentication (`/auth`)](#1-authentication-auth)
2. [User Profile & Management (`/users`)](#2-user-profile--management-users)
3. [Categories (`/categories`)](#3-categories-categories)
4. [Subcategories (`/subcategories`)](#4-subcategories-subcategories)
5. [Brands (`/brands`)](#5-brands-brands)
6. [Products (`/products`)](#6-products-products)
7. [Product Reviews (`/products/:productId/reviews`)](#7-product-reviews-productsproductidreviews)
8. [Wishlist (`/wishlist`)](#8-wishlist-wishlist)
9. [Customer Addresses (`/addresses`)](#9-customer-addresses-addresses)
10. [Coupons (`/coupons`)](#10-coupons-coupons)
11. [Cart (`/cart`)](#11-cart-cart)
12. [Orders (`/orders`)](#12-orders-orders)

---

## 1. Authentication (`/auth`)

### Register User (Signup)
* **Method**: `POST`
* **Route**: `/auth/signup`
* **Description**: Registers a new customer or administrator.
* **Authentication Required**: No
* **Request Body (JSON)**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123",
    "passwordConfirm": "password123",
    "role": "user" 
  }
  ```
  *(Note: If role is omitted, it defaults to 'user'. During bootstrapping, the first registered user is automatically granted 'admin' role)*
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7221c000e5ad99b8155260",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user",
      "createdAt": "2026-08-04T17:29:37.000Z",
      "updatedAt": "2026-08-04T17:29:37.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Possible Error Responses**:
  * `400 Bad Request` (Validation errors, e.g. password mismatch or duplicate email).

---

### Authenticate User (Login)
* **Method**: `POST`
* **Route**: `/auth/login`
* **Description**: Log in with credentials and receive a JWT.
* **Authentication Required**: No
* **Request Body (JSON)**:
  ```json
  {
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "_id": "6a7221c000e5ad99b8155260",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Possible Error Responses**:
  * `401 Unauthorized` (Incorrect email or password).

---

### Forgot Password
* **Method**: `POST`
* **Route**: `/auth/forgotPassword`
* **Description**: Generates a 6-digit reset code and emails it to the user.
* **Authentication Required**: No
* **Request Body**:
  ```json
  {
    "email": "jane@example.com"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "Success",
    "message": "Reset code sent to email"
  }
  ```

---

### Verify Reset Code
* **Method**: `POST`
* **Route**: `/auth/verifyResetCode`
* **Description**: Verifies the received password reset code.
* **Authentication Required**: No
* **Request Body**:
  ```json
  {
    "resetCode": "123456"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "Success"
  }
  ```

---

### Reset Password
* **Method**: `PUT`
* **Route**: `/auth/resetPassword`
* **Description**: Sets a new password after verifyResetCode.
* **Authentication Required**: No
* **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "newPassword": "newpassword123"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

## 2. User Profile & Management (`/users`)

### Get Current User Profile
* **Method**: `GET`
* **Route**: `/users/getMe`
* **Description**: Retrieve the current logged-in user profile details.
* **Authentication Required**: Yes (Any role)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "_id": "6a7221c000e5ad99b8155260",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    }
  }
  ```

---

### Update My Password
* **Method**: `PUT`
* **Route**: `/users/changeMyPassword`
* **Description**: User changes their own account password.
* **Authentication Required**: Yes (Any role)
* **Request Body**:
  ```json
  {
    "currentPassword": "password123",
    "password": "newpassword123",
    "passwordConfirm": "newpassword123"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### Update My Profile Information
* **Method**: `PUT`
* **Route**: `/users/updateMe`
* **Description**: User updates their name, email, or phone.
* **Authentication Required**: Yes (Any role)
* **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "janesmith@example.com",
    "phone": "01001234567"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "_id": "6a7221c000e5ad99b8155260",
      "name": "Jane Smith",
      "email": "janesmith@example.com",
      "phone": "01001234567",
      "role": "user"
    }
  }
  ```

---

### Deactivate My Account
* **Method**: `DELETE`
* **Route**: `/users/deleteMe`
* **Description**: User deactivates their own profile account (sets active flag to false).
* **Authentication Required**: Yes (Any role)
* **Example Success Response (`204 No Content`)**: Response contains no body.

---

### Get All Users
* **Method**: `GET`
* **Route**: `/users`
* **Description**: Retrieve list of users. Supports pagination, keyword search, fields, and sorting.
* **Authentication Required**: Yes (Admin/Manager only)
* **Query Parameters**: `page` (number), `limit` (number), `sort` (string), `keyword` (string)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "results": 1,
    "paginationResult": { "currentPage": 1, "limit": 50, "numberOfPages": 1 },
    "data": [
      {
        "_id": "6a7221c000e5ad99b8155260",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "user"
      }
    ]
  }
  ```

---

### Admin Create User
* **Method**: `POST`
* **Route**: `/users`
* **Description**: Admin creates a new user, admin, or manager.
* **Authentication Required**: Yes (Admin/Manager only)
* **Request Body**:
  ```json
  {
    "name": "Manager Account",
    "email": "manager@example.com",
    "password": "managerpassword",
    "passwordConfirm": "managerpassword",
    "role": "manager"
  }
  ```
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7222f02e1eb72f6a24749f",
      "name": "Manager Account",
      "email": "manager@example.com",
      "role": "manager"
    }
  }
  ```

---

### Admin Delete User
* **Method**: `DELETE`
* **Route**: `/users/:id`
* **Description**: Admin deletes a user account permanently.
* **Authentication Required**: Yes (Admin only)
* **URL Parameters**: `:id` (User Object ID)
* **Example Success Response (`204 No Content`)**: Response contains no body.

---

## 3. Categories (`/categories`)

### Get All Categories
* **Method**: `GET`
* **Route**: `/categories`
* **Description**: Get lists of categories.
* **Authentication Required**: No
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "results": 2,
    "data": [
      {
        "_id": "6a721ffae717c5c248946b1c",
        "name": "Fruits",
        "slug": "fruits",
        "image": "http://localhost:8080/categories/category-123.jpeg"
      },
      {
        "_id": "6a722017e717c5c248946b2f",
        "name": "Vegetables",
        "slug": "vegetables"
      }
    ]
  }
  ```

---

### Create Category
* **Method**: `POST`
* **Route**: `/categories`
* **Description**: Add a new category. Supports file upload for the `image` field.
* **Authentication Required**: Yes (Admin/Manager only)
* **Request Body (Multipart Form or JSON)**:
  * `name` (String, required)
  * `image` (File, optional)
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a721ffae717c5c248946b1c",
      "name": "Fruits",
      "slug": "fruits",
      "image": "http://localhost:8080/categories/category-98213.jpeg"
    }
  }
  ```

---

### Update Category
* **Method**: `PUT`
* **Route**: `/categories/:id`
* **Description**: Updates category details.
* **Authentication Required**: Yes (Admin/Manager only)
* **URL Parameters**: `:id` (Category ID)
* **Request Body (Multipart Form or JSON)**:
  * `name` (String, optional)
  * `image` (File, optional)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "_id": "6a721ffae717c5c248946b1c",
      "name": "Fresh Fruits",
      "slug": "fresh-fruits"
    }
  }
  ```

---

### Delete Category
* **Method**: `DELETE`
* **Route**: `/categories/:id`
* **Description**: Deletes a category.
* **Authentication Required**: Yes (Admin only)
* **URL Parameters**: `:id` (Category ID)
* **Example Success Response (`204 No Content`)**: Response contains no body.

---

## 4. Subcategories (`/subcategories`)

### Get All Subcategories
* **Method**: `GET`
* **Route**: `/subcategories`
* **Description**: Gets all subcategories.
* **Authentication Required**: No

---

### Create Subcategory
* **Method**: `POST`
* **Route**: `/subcategories`
* **Description**: Creates a subcategory under a category.
* **Authentication Required**: Yes (Admin/Manager only)
* **Request Body (JSON)**:
  ```json
  {
    "name": "Leafy Greens",
    "category": "6a722017e717c5c248946b2f"
  }
  ```
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7222b42e1eb72f6a2474a1",
      "name": "Leafy Greens",
      "slug": "leafy-greens",
      "category": "6a722017e717c5c248946b2f"
    }
  }
  ```

---

## 5. Brands (`/brands`)

### Get All Brands
* **Method**: `GET`
* **Route**: `/brands`
* **Description**: Retrieves all brands.
* **Authentication Required**: No

---

### Create Brand
* **Method**: `POST`
* **Route**: `/brands`
* **Description**: Creates a new brand. Supports file upload for the `image` field.
* **Authentication Required**: Yes (Admin/Manager only)
* **Request Body (Multipart Form or JSON)**:
  * `name` (String, required)
  * `image` (File, optional)
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7222b42e1eb72f6a24749e",
      "name": "Organic Farms",
      "slug": "organic-farms"
    }
  }
  ```

---

## 6. Products (`/products`)

### Get All Products
* **Method**: `GET`
* **Route**: `/products`
* **Description**: Retrieves list of products. Supports pagination, keyword search, sorting, filtering (like `price[gte]`, `category`).
* **Authentication Required**: No
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "results": 1,
    "data": [
      {
        "_id": "6a7222e02e1eb72f6a2474e4",
        "name": "Red Apples",
        "title": "Red Apples",
        "slug": "red-apples",
        "originalPrice": 10,
        "price": 10,
        "discountPercentage": 20,
        "discountedPrice": 8,
        "priceAfterDiscount": 8,
        "quantity": 48,
        "image": "http://localhost:8080/products/apples.jpeg",
        "imageCover": "http://localhost:8080/products/apples.jpeg"
      }
    ]
  }
  ```

---

### Get Discounted Products
* **Method**: `GET`
* **Route**: `/products/discounted`
* **Description**: Public endpoint returning only products having `discountPercentage > 0`.
* **Authentication Required**: No
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "results": 1,
    "data": [
      {
        "_id": "6a7222e02e1eb72f6a2474e4",
        "name": "Red Apples",
        "discountPercentage": 20,
        "discountedPrice": 8
      }
    ]
  }
  ```

---

### Get Specific Product
* **Method**: `GET`
* **Route**: `/products/:id`
* **Description**: Retrieves product details populated with reviews.
* **Authentication Required**: No
* **URL Parameters**: `:id` (Product ID)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "_id": "6a7222e02e1eb72f6a2474e4",
      "name": "Red Apples",
      "originalPrice": 10,
      "discountedPrice": 8,
      "reviews": [
        {
          "_id": "6a7222b42e1eb72f6a2474bb",
          "title": "Superb quality!",
          "ratings": 5,
          "user": "6a7221c000e5ad99b8155260"
        }
      ]
    }
  }
  ```

---

### Create Product
* **Method**: `POST`
* **Route**: `/products`
* **Description**: Creates a new product. Supports file uploads for single `image` cover and a list of `images` details.
* **Authentication Required**: Yes (Admin/Manager only)
* **Request Body (Multipart Form or JSON)**:
  * `name` or `title` (String, required)
  * `description` (String, optional)
  * `quantity` (Number, represents stock, required)
  * `originalPrice` or `price` (Number, required)
  * `discountPercentage` (Number, optional, 0 to 100)
  * `category` (MongoId, required)
  * `subcategories` (Array of MongoId, optional)
  * `brand` (MongoId, optional)
  * `colors` (Array of String, optional)
  * `image` or `imageCover` (File, required)
  * `images` (Files list, optional)
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7222e02e1eb72f6a2474e4",
      "name": "Red Apples",
      "title": "Red Apples",
      "originalPrice": 10,
      "price": 10,
      "discountPercentage": 20,
      "discountedPrice": 8,
      "priceAfterDiscount": 8,
      "quantity": 50,
      "image": "http://localhost:8080/products/product-123-cover.jpeg",
      "imageCover": "http://localhost:8080/products/product-123-cover.jpeg"
    }
  }
  ```

---

### Update Product
* **Method**: `PUT`
* **Route**: `/products/:id`
* **Description**: Updates product details (prices, stock, discountPercentage, category, etc.). Recalculates discountedPrice if prices or percentage are changed.
* **Authentication Required**: Yes (Admin/Manager only)
* **URL Parameters**: `:id` (Product ID)
* **Request Body**: (JSON fields to update)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "_id": "6a7222e02e1eb72f6a2474e4",
      "name": "Red Apples",
      "originalPrice": 10,
      "discountPercentage": 0,
      "discountedPrice": 10 
    }
  }
  ```
  *(Note: Setting discountPercentage to 0 sets discountedPrice equal to originalPrice)*

---

### Delete Product
* **Method**: `DELETE`
* **Route**: `/products/:id`
* **Description**: Deletes a product.
* **Authentication Required**: Yes (Admin only)
* **URL Parameters**: `:id` (Product ID)
* **Example Success Response (`204 No Content`)**: Response contains no body.

---

## 7. Product Reviews (`/products/:productId/reviews`)

### Get Product Reviews
* **Method**: `GET`
* **Route**: `/products/:productId/reviews`
* **Description**: Retrieves reviews left for a specific product.
* **Authentication Required**: No

---

### Create Review
* **Method**: `POST`
* **Route**: `/products/:productId/reviews`
* **Description**: Customer leaves a rating and review for a product. Automatically updates product ratingsAverage and ratingsQuantity.
* **Authentication Required**: Yes (Customer user only)
* **URL Parameters**: `:productId` (Product ID)
* **Request Body**:
  ```json
  {
    "title": "Delicious!",
    "ratings": 4.5
  }
  ```
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7222b42e1eb72f6a2474bb",
      "title": "Delicious!",
      "ratings": 4.5,
      "product": "6a7222e02e1eb72f6a2474e4",
      "user": "6a7221c000e5ad99b8155260"
    }
  }
  ```

---

### Delete Review
* **Method**: `DELETE`
* **Route**: `/products/:productId/reviews/:id`
* **Description**: Deletes a review.
* **Authentication Required**: Yes (Review owner, Admin or Manager)
* **URL Parameters**: `:id` (Review ID)
* **Example Success Response (`204 No Content`)**: Response contains no body.

---

## 8. Wishlist (`/wishlist`)

### Add Product to Wishlist
* **Method**: `POST`
* **Route**: `/wishlist`
* **Description**: Adds a product to the user's wishlist/favorites.
* **Authentication Required**: Yes (Customer user only)
* **Request Body**:
  ```json
  {
    "productId": "6a7222e02e1eb72f6a2474e4"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Product added successfully to your wishlist.",
    "data": [ "6a7222e02e1eb72f6a2474e4" ]
  }
  ```

---

### Get Logged User Wishlist
* **Method**: `GET`
* **Route**: `/wishlist`
* **Description**: Gets the customer's wishlist products populated.
* **Authentication Required**: Yes (Customer user only)

---

### Remove Product from Wishlist
* **Method**: `DELETE`
* **Route**: `/wishlist/:productId`
* **Description**: Removes a product from the user's wishlist.
* **Authentication Required**: Yes (Customer user only)
* **URL Parameters**: `:productId` (Product ID)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Product removed successfully from your wishlist.",
    "data": []
  }
  ```

---

## 9. Customer Addresses (`/addresses`)

### Add Customer Address
* **Method**: `POST`
* **Route**: `/addresses`
* **Description**: Add a shipping address to the customer profile.
* **Authentication Required**: Yes (Customer user only)
* **Request Body**:
  ```json
  {
    "alias": "Work",
    "details": "Tech Park, Building B",
    "phone": "01112223333",
    "city": "Giza",
    "postalCode": "12511"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "_id": "6a7222b42e1eb72f6a247499",
        "alias": "Work",
        "details": "Tech Park, Building B",
        "phone": "01112223333",
        "city": "Giza",
        "postalCode": "12511"
      }
    ]
  }
  ```

---

### Get My Addresses
* **Method**: `GET`
* **Route**: `/addresses`
* **Description**: Retrieve saved addresses.
* **Authentication Required**: Yes (Customer user only)

---

### Remove Address
* **Method**: `DELETE`
* **Route**: `/addresses/:addressId`
* **Description**: Remove an address from customer profile.
* **Authentication Required**: Yes (Customer user only)
* **URL Parameters**: `:addressId` (Address ID)

---

## 10. Coupons (`/coupons`)

### Create Coupon
* **Method**: `POST`
* **Route**: `/coupons`
* **Description**: Create a shopping cart discount coupon code.
* **Authentication Required**: Yes (Admin/Manager only)
* **Request Body**:
  ```json
  {
    "name": "WINTER30",
    "expire": "2026-12-31T23:59:59Z",
    "discount": 30
  }
  ```
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "_id": "6a7222f02e1eb72f6a247490",
      "name": "WINTER30",
      "expire": "2026-12-31T23:59:59Z",
      "discount": 30
    }
  }
  ```

---

### Get Coupons
* **Method**: `GET`
* **Route**: `/coupons`
* **Description**: Lists all active coupons.
* **Authentication Required**: Yes (Admin/Manager only)

---

### Delete Coupon
* **Method**: `DELETE`
* **Route**: `/coupons/:id`
* **Description**: Deletes a coupon.
* **Authentication Required**: Yes (Admin/Manager only)
* **URL Parameters**: `:id` (Coupon ID)

---

## 11. Cart (`/cart`)

### Add Product to Cart
* **Method**: `POST`
* **Route**: `/cart`
* **Description**: Adds a product to the user's active cart. If product is already in the cart, increases quantity. Validates stock availability.
* **Authentication Required**: Yes (Customer user only)
* **Request Body**:
  ```json
  {
    "productId": "6a7222e02e1eb72f6a2474e4",
    "color": "Red"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Product added to cart successfully",
    "data": {
      "_id": "6a7222b42e1eb72f6a24751a",
      "cartItems": [
        {
          "product": {
            "_id": "6a7222e02e1eb72f6a2474e4",
            "name": "Red Apples",
            "originalPrice": 10,
            "discountedPrice": 8
          },
          "quantity": 1,
          "color": "Red",
          "price": 8,
          "totalPrice": 8
        }
      ],
      "totalQuantity": 1,
      "totalCartPrice": 8,
      "user": "6a7221c000e5ad99b8155260"
    }
  }
  ```

---

### Get Logged User Cart
* **Method**: `GET`
* **Route**: `/cart`
* **Description**: Gets the customer's cart. Re-verifies prices dynamically.
* **Authentication Required**: Yes (Customer user only)

---

### Update Cart Item Quantity
* **Method**: `PUT`
* **Route**: `/cart/:itemId`
* **Description**: Updates the quantity of a specific item in the cart. Re-validates stock.
* **Authentication Required**: Yes (Customer user only)
* **URL Parameters**: `:itemId` (Cart Item ID)
* **Request Body**:
  ```json
  {
    "quantity": 3
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "cartItems": [
        {
          "product": "6a7222e02e1eb72f6a2474e4",
          "quantity": 3,
          "price": 8,
          "totalPrice": 24
        }
      ],
      "totalQuantity": 3,
      "totalCartPrice": 24
    }
  }
  ```

---

### Remove Cart Item
* **Method**: `DELETE`
* **Route**: `/cart/:itemId`
* **Description**: Removes an item from the cart.
* **Authentication Required**: Yes (Customer user only)
* **URL Parameters**: `:itemId` (Cart Item ID)

---

### Clear Cart
* **Method**: `DELETE`
* **Route**: `/cart`
* **Description**: Deletes the customer's active cart.
* **Authentication Required**: Yes (Customer user only)
* **Example Success Response (`204 No Content`)**: Response contains no body.

---

### Apply Coupon to Cart
* **Method**: `PUT`
* **Route**: `/cart/applyCoupon`
* **Description**: Applies a coupon code to the cart. Calculates `totalPriceAfterDiscount` based on the coupon percentage.
* **Authentication Required**: Yes (Customer user only)
* **Request Body**:
  ```json
  {
    "coupon": "WINTER30"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "numOfCartItems": 1,
    "data": {
      "totalCartPrice": 24,
      "totalPriceAfterDiscount": 16.8,
      "totalQuantity": 3
    }
  }
  ```

---

## 12. Orders (`/orders`)

### Checkout Cart (Create Order)
* **Method**: `POST`
* **Route**: `/orders`
* **Description**: Confirms the customer order. Saves the order details, clears the cart, decrements product stock, and generates a ready-to-use WhatsApp redirect URL.
* **Authentication Required**: Yes (Customer user only)
* **Request Body**:
  ```json
  {
    "customerName": "Jane Doe",
    "phone": "01001234567",
    "address": "23 Vegetable Rd, Cairo",
    "taxPrice": 2,
    "shippingPrice": 5
  }
  ```
* **Example Success Response (`201 Created`)**:
  ```json
  {
    "status": "success",
    "data": {
      "_id": "6a7222e02e1eb72f6a24755a",
      "customerName": "Jane Doe",
      "phone": "01001234567",
      "address": "23 Vegetable Rd, Cairo",
      "cartItems": [
        {
          "product": "6a7222e02e1eb72f6a2474e4",
          "quantity": 2,
          "price": 8
        }
      ],
      "taxPrice": 2,
      "shippingPrice": 5,
      "totalOrderPrice": 23,
      "finalTotal": 23,
      "paymentMethodType": "cash",
      "isPaid": false,
      "isDelivered": false,
      "orderStatus": "pending",
      "orderDate": "2026-08-04T17:30:00.000Z",
      "user": "6a7221c000e5ad99b8155260"
    },
    "whatsappUrl": "https://wa.me/201000000000?text=*New%20Order%20Details*..."
  }
  ```

---

### Get Orders
* **Method**: `GET`
* **Route**: `/orders`
* **Description**: Retrieve order history. User gets their own orders; admin/manager retrieve all orders.
* **Authentication Required**: Yes (Any role)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "results": 1,
    "data": [
      {
        "_id": "6a7222e02e1eb72f6a24755a",
        "customerName": "Jane Doe",
        "finalTotal": 23,
        "orderStatus": "pending"
      }
    ]
  }
  ```

---

### Get Order Details
* **Method**: `GET`
* **Route**: `/orders/:id`
* **Description**: Retrieve specific order details by ID.
* **Authentication Required**: Yes (Any role)
* **URL Parameters**: `:id` (Order ID)

---

### Update Order Status
* **Method**: `PUT`
* **Route**: `/orders/:id/status`
* **Description**: Update order status (pending/completed/cancelled).
* **Authentication Required**: Yes (Admin/Manager only)
* **URL Parameters**: `:id` (Order ID)
* **Request Body**:
  ```json
  {
    "status": "completed"
  }
  ```
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "_id": "6a7222e02e1eb72f6a24755a",
      "orderStatus": "completed"
    }
  }
  ```

---

### Update Payment Status to Paid
* **Method**: `PUT`
* **Route**: `/orders/:id/pay`
* **Description**: Marks the order as paid.
* **Authentication Required**: Yes (Admin/Manager only)
* **URL Parameters**: `:id` (Order ID)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "_id": "6a7222e02e1eb72f6a24755a",
      "isPaid": true,
      "paidAt": "2026-08-04T17:35:00.000Z"
    }
  }
  ```

---

### Update Delivery Status to Delivered
* **Method**: `PUT`
* **Route**: `/orders/:id/deliver`
* **Description**: Marks the order as delivered.
* **Authentication Required**: Yes (Admin/Manager only)
* **URL Parameters**: `:id` (Order ID)
* **Example Success Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "_id": "6a7222e02e1eb72f6a24755a",
      "isDelivered": true,
      "deliveredAt": "2026-08-04T17:35:00.000Z"
    }
  }
  ```
