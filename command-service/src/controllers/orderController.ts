import { Request, Response } from 'express';
import { getClient } from '../config/db';

export const createOrder = async (req: Request, res: Response) => {
    const { customerId, items } = req.body;
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // 1. Calculate total and verify stock (simplified for now, assuming valid)
        let totalAmount = 0;
        for (const item of items) {
            // Logic to fetch price and check stock should be here.
            // For this simplified version, we assume item.price is passed or we trust the input for now
            // Real implementation would SELECT price FROM products WHERE id = item.productId
            totalAmount += item.price * item.quantity;
        }

        // 2. Insert Order
        const orderResult = await client.query(
            'INSERT INTO orders (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id, created_at',
            [customerId, totalAmount, 'PENDING']
        );
        const orderId = orderResult.rows[0].id;
        const createdAt = orderResult.rows[0].created_at;

        // 3. Insert Order Items
        for (const item of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.productId, item.quantity, item.price]
            );
        }

        // 4. Create Outbox Event
        const eventPayload = {
            eventType: 'OrderCreated',
            orderId,
            customerId,
            items,
            total: totalAmount,
            timestamp: createdAt,
        };

        await client.query(
            'INSERT INTO outbox (topic, payload) VALUES ($1, $2)',
            ['order_events', JSON.stringify(eventPayload)]
        );

        await client.query('COMMIT');

        res.status(201).json({ orderId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};
