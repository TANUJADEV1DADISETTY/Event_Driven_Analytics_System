-- Create read_db (write_db is created by default via POSTGRES_DB)
CREATE DATABASE read_db;

-- Connect to write_db to create tables
\c write_db;

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);

-- Connect to read_db to create tables/views
\c read_db;

CREATE TABLE IF NOT EXISTS product_sales_view (
    product_id INTEGER PRIMARY KEY,
    total_quantity_sold INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    order_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS category_metrics_view (
    category_name VARCHAR(255) PRIMARY KEY,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customer_ltv_view (
    customer_id INTEGER PRIMARY KEY,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    last_order_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hourly_sales_view (
    hour_timestamp TIMESTAMP PRIMARY KEY,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);
