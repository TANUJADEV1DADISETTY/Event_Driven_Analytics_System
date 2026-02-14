import { Request, Response } from 'express';
import { query } from '../config/db';

export const getProductSales = async (req: Request, res: Response) => {
    const { productId } = req.params;
    try {
        const result = await query('SELECT * FROM product_sales_view WHERE product_id = $1', [productId]);
        if (result.rows.length === 0) {
            // Return 0s if not found, or 404. Requirement says "Success Response", implying it should exist or return empty stats.
            // Let's return empty stats if product exists but no sales, or just empty stats.
            // Requirement verification says "Verify response body contains..."
            return res.json({
                productId: productId,
                totalQuantitySold: 0,
                totalRevenue: 0,
                orderCount: 0
            });
        }
        const row = result.rows[0];
        res.json({
            productId: row.product_id,
            totalQuantitySold: parseInt(row.total_quantity_sold), // pg returns bigints/numerics as strings often
            totalRevenue: parseFloat(row.total_revenue),
            orderCount: parseInt(row.order_count)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getCategoryRevenue = async (req: Request, res: Response) => {
    const { category } = req.params;
    try {
        const result = await query('SELECT * FROM category_metrics_view WHERE category_name = $1', [category]);
        if (result.rows.length === 0) {
            return res.json({
                category: category,
                totalRevenue: 0,
                totalOrders: 0
            });
        }
        const row = result.rows[0];
        res.json({
            category: row.category_name,
            totalRevenue: parseFloat(row.total_revenue),
            totalOrders: parseInt(row.total_orders)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getCustomerLtv = async (req: Request, res: Response) => {
    const { customerId } = req.params;
    try {
        const result = await query('SELECT * FROM customer_ltv_view WHERE customer_id = $1', [customerId]);
        if (result.rows.length === 0) {
            return res.json({
                customerId: customerId,
                totalSpent: 0,
                orderCount: 0,
                lastOrderDate: null
            });
        }
        const row = result.rows[0];
        res.json({
            customerId: row.customer_id,
            totalSpent: parseFloat(row.total_spent),
            orderCount: parseInt(row.order_count),
            lastOrderDate: row.last_order_date // Timestamps usually returned as Date objects or strings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getSyncStatus = async (req: Request, res: Response) => {
    try {
        // Get the latest processed event timestamp
        const result = await query('SELECT processed_at FROM processed_events ORDER BY processed_at DESC LIMIT 1');

        let lastProcessedEventTimestamp = null;
        let lagSeconds = 0;

        if (result.rows.length > 0) {
            const lastDate = new Date(result.rows[0].processed_at);
            lastProcessedEventTimestamp = lastDate.toISOString();
            const now = new Date();
            lagSeconds = (now.getTime() - lastDate.getTime()) / 1000;
        }

        res.json({
            lastProcessedEventTimestamp,
            lagSeconds
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
