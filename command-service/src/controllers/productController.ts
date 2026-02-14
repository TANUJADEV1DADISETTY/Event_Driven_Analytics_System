import { Request, Response } from 'express';
import { getClient } from '../config/db';

export const createProduct = async (req: Request, res: Response) => {
    const { name, category, price, stock } = req.body;
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, category, price, stock]
        );
        const productId = result.rows[0].id;

        const eventPayload = {
            eventType: 'ProductCreated',
            productId,
            name,
            category,
            price,
            stock,
        };

        await client.query(
            'INSERT INTO outbox (topic, payload) VALUES ($1, $2)',
            ['product_events', JSON.stringify(eventPayload)]
        );

        await client.query('COMMIT');

        res.status(201).json({ productId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating product', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};
