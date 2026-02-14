# CQRS & Event-Driven E-Commerce Analytics System

## 🚀 Project Overview

This project implements a **high-performance, scalable CQRS (Command Query Responsibility Segregation) and Event-Driven Architecture** for an e-commerce analytics platform.

The system separates:

- **Write operations (Commands)** → handled by Command Service
- **Read operations (Queries)** → handled by Query Service
- **Event processing** → handled by Consumer Service
- **Message brokering** → handled by RabbitMQ
- **Transactional reliability** → ensured using the Outbox Pattern

This architecture demonstrates scalability, eventual consistency, and resilient backend design commonly used in production systems.

---

## 🏗️ Architecture

### Services

1. **Command Service (Port 8080)**
   - Handles product & order creation
   - Writes to primary database
   - Writes events to outbox table
   - Publishes events to message broker

2. **Consumer Service**
   - Listens to broker events
   - Updates read models (materialized views)
   - Ensures idempotency

3. **Query Service (Port 8081)**
   - Provides fast analytics APIs
   - Reads from optimized read database

4. **Primary Database (PostgreSQL)**
   - Stores transactional data
   - Includes outbox table

5. **Read Database (PostgreSQL)**
   - Stores denormalized analytics views

6. **RabbitMQ**
   - Event broker
   - Enables asynchronous communication

---

## 🧠 Core Concepts Implemented

- CQRS Pattern
- Event-Driven Architecture
- Transactional Outbox Pattern
- Idempotent Consumers
- Eventual Consistency
- Materialized Views for Analytics
- Dockerized Microservices

---

## 🛠 Technology Stack

### Backend

- Node.js
- Express.js
- PostgreSQL
- RabbitMQ
- UUID

### DevOps

- Docker
- Docker Compose

---

## 📂 Project Structure

```
root/
│
├── docker-compose.yml
├── .env.example
├── submission.json
│
├── command-service/
├── consumer-service/
├── query-service/
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Docker
- Docker Compose

---

## ▶️ Start System

From root directory:

```bash
docker-compose down -v
docker-compose up --build
```

Wait until all services are healthy.

---

## 🔍 Verify Services

### Command Service Health

```bash
GET http://localhost:8080/health
```

Expected:

```
200 OK
```

---

### Query Service Health

```bash
GET http://localhost:8081/health
```

Expected:

```
200 OK
```

---

## 🧾 Write Model Database Schema

### Tables

- products
- orders
- order_items
- outbox

Outbox columns:

| Column       | Type      |
| ------------ | --------- |
| id           | UUID      |
| topic        | VARCHAR   |
| payload      | JSONB     |
| created_at   | TIMESTAMP |
| published_at | TIMESTAMP |

---

## 📊 Read Model Tables

- product_sales_view
- category_metrics_view
- customer_ltv_view
- hourly_sales_view
- processed_events

---

## 🔥 API Endpoints

---

### 🟢 Create Product

```
POST /api/products
```

Body:

```json
{
  "name": "Laptop",
  "category": "Electronics",
  "price": 1000,
  "stock": 10
}
```

Response:

```json
{
  "productId": 1
}
```

---

### 🟢 Create Order

```
POST /api/orders
```

Body:

```json
{
  "customerId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 1000
    }
  ]
}
```

Response:

```json
{
  "orderId": 1
}
```

---

## 📈 Analytics APIs (Query Service)

---

### 🟢 Product Sales

```
GET /api/analytics/products/{productId}/sales
```

Example:

```
GET http://localhost:8081/api/analytics/products/1/sales
```

Response:

```json
{
  "productId": 1,
  "totalQuantitySold": 5,
  "totalRevenue": 5000,
  "orderCount": 2
}
```

---

### 🟢 Category Revenue

```
GET /api/analytics/categories/{category}/revenue
```

Example:

```
GET http://localhost:8081/api/analytics/categories/Electronics/revenue
```

Response:

```json
{
  "category": "Electronics",
  "totalRevenue": 5000,
  "totalOrders": 2
}
```

---

### 🟢 Customer Lifetime Value

```
GET /api/analytics/customers/{customerId}/lifetime-value
```

Example:

```
GET http://localhost:8081/api/analytics/customers/1/lifetime-value
```

Response:

```json
{
  "customerId": 1,
  "totalSpent": 5000,
  "orderCount": 2,
  "lastOrderDate": "2026-02-14T10:00:00Z"
}
```

---

### 🟢 Sync Status

```
GET /api/analytics/sync-status
```

Response:

```json
{
  "lastProcessedEventTimestamp": "2026-02-14T10:00:00Z",
  "lagSeconds": 0
}
```

---

## 🧪 Testing Flow

1. Create Product
2. Create Order
3. Immediately check analytics → old values
4. Wait 5–10 seconds
5. Check analytics again → updated values

This demonstrates **Eventual Consistency**.

---

## 🔄 Event Flow

1. Order created
2. Order written to write DB
3. OrderCreated event written to outbox
4. Publisher sends event to RabbitMQ
5. Consumer receives event
6. Consumer updates read DB
7. Query service serves aggregated data

---

## 🛡 Reliability Features

- Outbox ensures no lost events
- Consumer idempotency prevents duplicate processing
- Docker health checks ensure readiness
- Services isolated and scalable independently

---

## 📦 Environment Variables (.env.example)

```
DATABASE_URL=postgresql://user:password@db:5432/write_db
READ_DATABASE_URL=postgresql://user:password@read_db:5432/read_db
BROKER_URL=amqp://guest:guest@broker:5672/
COMMAND_SERVICE_PORT=8080
QUERY_SERVICE_PORT=8081
```

---

## 📝 submission.json

```
{
  "commandServiceUrl": "http://localhost:8080",
  "queryServiceUrl": "http://localhost:8081"
}
```

---

## 🎯 Key Advantages

- Scalable architecture
- Separation of concerns
- High-performance read queries
- Fault-tolerant event publishing
- Industry-standard design pattern

---

## 🚀 Conclusion

This project demonstrates a production-ready CQRS and Event-Driven architecture suitable for high-scale e-commerce systems. It showcases modern backend engineering practices including microservices, asynchronous communication, transactional reliability, and eventual consistency.
