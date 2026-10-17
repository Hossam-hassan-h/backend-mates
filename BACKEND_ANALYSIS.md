# Backend Analysis - Fruit & Vegetable Store E-Commerce

This document analyzes the reusable structure and architecture of the original backend, ignoring the business logic of the previous application.

## Folder Structure

The project follows a standard MVC-inspired architecture for Express applications, organized as follows:
- **`config/`**: Contains configuration files (e.g., database connection setups).
- **`middlewares/`**: Houses global and route-specific middleware functions (e.g., global error handling, image uploading, and validation result interceptors).
- **`models/`**: Defines the Mongoose schemas and models representing the database entities.
- **`routes/`**: Handles application endpoint definitions, grouping related paths into sub-routers and mounting them in a central index router.
- **`services/`**: Contains the controller logic (historically named `services` in this template) and links business logic with Database Operations.
- **`utils/`**: Houses utility classes and functions, including custom validation rules, API features, token helpers, and email dispatch services.
- **`uploads/`**: Serves as the destination directory for static asset storage (like processed images).

---

## Reusable Architecture & Components

### 1. Controllers Factory (`services/handlersFactory.js`)
The backend features a generic factory that provides standardized CRUD operations for any Mongoose model. This minimizes code duplication:
- **`createOne(Model)`**: Handles document creation (`201 Created`).
- **`getOne(Model, populationOpt)`**: Fetches a single document by ID, optionally populating references (`200 OK`).
- **`getAll(Model, modelName)`**: Queries multiple documents with support for advanced filtering, search, pagination, and sorting via `ApiFeatures` (`200 OK`).
- **`updateOne(Model)`**: Updates a document by ID (`200 OK`).
- **`deleteOne(Model)`**: Deletes a document by ID (`204 No Content`).

### 2. API Features Utility (`utils/apiFeatures.js`)
A custom helper that processes HTTP query parameters to dynamically build Mongoose queries. It provides:
- **Pagination**: Standardizes request limits and pages, calculating metadata (e.g., current page, total pages).
- **Sorting**: Handles multi-column sorting (e.g., `?sort=-price,sold`).
- **Filtering**: Filters out system parameters (like `page`, `limit`, `sort`, `fields`) and formats operators (e.g., convert `price[gte]=10` to `$gte: 10`).
- **Field Limiting**: Selects specific fields to return in the JSON response (e.g., `?fields=name,price`).
- **Search**: Executes regex searches across text fields defined for the model (e.g., product titles).

### 3. Global Error Handling Middleware (`middlewares/errorMiddleware.js` & `utils/apiError.js`)
- **`ApiError` Class**: Extends the native `Error` object to capture HTTP status codes and label errors as operational.
- **Global Error Middleware**: Intercepts all unhandled Express routing errors. It differentiates responses based on `process.env.NODE_ENV`:
  - **Development**: Returns full stack traces, detailed error objects, and messages.
  - **Production**: Returns sanitised, user-friendly messages and handles common library exceptions (e.g., JWT validation or expiry errors) securely.

### 4. Input Validation Middleware (`middlewares/validatorMiddleware.js`)
Integrates with `express-validator` to capture validation errors in a generic middleware, returning a structured `400 Bad Request` with an array of validation errors to the client, preventing illegal payloads from reaching the controllers.

### 5. File Upload System (`middlewares/uploadImageMiddleware.js`)
Utilizes `multer` (in-memory storage) to validate that uploaded files are images (filtering by mime type). Offers utilities for:
- **`uploadSingleImage(fieldName)`**: Handles single image file uploads.
- **`uploadMixOfImages(arrayOfFields)`**: Handles multi-field image uploads.
Image resizing and conversion to `.jpeg` format are offloaded to `sharp` in respective controllers before saving to the `uploads/` directory.

### 6. Authentication & Authorization (`services/authService.js`)
Provides JWT-based security middleware:
- **`protect`**: Validates the Bearer token in the request header, checks if the user still exists in the database, and ensures their password was not changed since the token's issuance.
- **`allowedTo(...roles)`**: Implements role-based access control (RBAC), verifying if the user's role matches authorization requirements.

---

## Coding Conventions & Database
- **Mongoose / MongoDB**: All entities are modeled as Mongoose schemas with timestamps and post-save/init hooks to resolve absolute static image URLs.
- **Async Handling**: Uses `express-async-handler` to automatically catch errors inside async routes and forward them to the global error middleware, avoiding `try-catch` boilerplate.
