import { query, getClient } from '../config/db';

// Helper to check idempotency
const isEventProcessed = async (eventId: string, client: any): Promise<boolean> => {
    const result = await client.query('SELECT 1 FROM processed_events WHERE event_id = $1', [eventId]);
    return result.rowCount > 0;
};

const markEventProcessed = async (eventId: string, client: any) => {
    await client.query('INSERT INTO processed_events (event_id) VALUES ($1)', [eventId]);
};

export const handleProductCreated = async (payload: any, eventId: string) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        if (await isEventProcessed(eventId, client)) {
            await client.query('ROLLBACK');
            return;
        }

        // Access payload directly - passed from RabbitMQ consumer
        const { productId, category } = payload;

        // We need a way to store product categories in read side to join later, 
        // or we just trust we don't need it if we aren't joining.
        // OPTION: Create a small lookup table in read_db for product categories.
        // For now, let's create a table 'read_products' in init.sql if not exists or just distinct table.
        // Let's CREATE it dynamically if it doesn't exist, strictly for read model usage.

        await client.query(
            `CREATE TABLE IF NOT EXISTS read_products (
        product_id INTEGER PRIMARY KEY,
        category VARCHAR(255)
      )`
        );

        await client.query(
            'INSERT INTO read_products (product_id, category) VALUES ($1, $2) ON CONFLICT (product_id) DO UPDATE SET category = EXCLUDED.category',
            [productId, category]
        );

        await markEventProcessed(eventId, client);
        await client.query('COMMIT');
        console.log(`Processed ProductCreated: ${productId}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error handling ProductCreated', err);
        throw err;
    } finally {
        client.release();
    }
};

export const handleOrderCreated = async (payload: any, eventId: string) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        if (await isEventProcessed(eventId, client)) {
            await client.query('ROLLBACK');
            return;
        }

        const { orderId, customerId, items, total, timestamp } = payload;

        // 1. Update Customer LTV
        await client.query(
            `INSERT INTO customer_ltv_view (customer_id, total_spent, order_count, last_order_date)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (customer_id) DO UPDATE SET
       total_spent = customer_ltv_view.total_spent + EXCLUDED.total_spent,
       order_count = customer_ltv_view.order_count + 1,
       last_order_date = EXCLUDED.last_order_date`,
            [customerId, total, timestamp]
        );

        // 2. Update Hourly Sales
        // timestamp is like '2023-10-27T14:30:00Z'
        const dateObj = new Date(timestamp);
        dateObj.setMinutes(0, 0, 0); // Round down to hour
        const hourTimestamp = dateObj.toISOString();

        await client.query(
            `INSERT INTO hourly_sales_view (hour_timestamp, total_orders, total_revenue)
         VALUES ($1, 1, $2)
         ON CONFLICT (hour_timestamp) DO UPDATE SET
         total_orders = hourly_sales_view.total_orders + 1,
         total_revenue = hourly_sales_view.total_revenue + EXCLUDED.total_revenue`,
            [hourTimestamp, total]
        );

        // 3. Update Product Sales & Category Metrics
        for (const item of items) {
            // item: { productId, quantity, price }
            const { productId, quantity, price } = item;
            const itemTotal = quantity * price;

            // Product Sales View
            await client.query(
                `INSERT INTO product_sales_view (product_id, total_quantity_sold, total_revenue, order_count)
             VALUES ($1, $2, $3, 1)
             ON CONFLICT (product_id) DO UPDATE SET
             total_quantity_sold = product_sales_view.total_quantity_sold + EXCLUDED.total_quantity_sold,
             total_revenue = product_sales_view.total_revenue + EXCLUDED.total_revenue,
             order_count = product_sales_view.order_count + 1`,
                [productId, quantity, itemTotal]
            );

            // Category Metrics View
            // We need the category. Fetch from read_products
            const prodRes = await client.query('SELECT category FROM read_products WHERE product_id = $1', [productId]);
            if (prodRes.rows.length > 0) {
                const category = prodRes.rows[0].category;
                await client.query(
                    `INSERT INTO category_metrics_view (category_name, total_revenue, total_orders)
                 VALUES ($1, $2, 1)
                 ON CONFLICT (category_name) DO UPDATE SET
                 total_revenue = category_metrics_view.total_revenue + EXCLUDED.total_revenue,
                 total_orders = category_metrics_view.total_orders + 1`,
                    [category, itemTotal]
                );
            } else {
                console.warn(`Category not found for product ${productId}, skipping category metric update.`);
            }
        }

        await markEventProcessed(eventId, client);
        await client.query('COMMIT');
        console.log(`Processed OrderCreated: ${orderId}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error handling OrderCreated', err);
        throw err;
    } finally {
        client.release();
    }
};
