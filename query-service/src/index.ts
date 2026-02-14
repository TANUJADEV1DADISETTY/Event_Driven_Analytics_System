import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getProductSales, getCategoryRevenue, getCustomerLtv, getSyncStatus } from './controllers/analyticsController';

dotenv.config();

const app = express();
const port = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/analytics/products/:productId/sales', getProductSales as any);
app.get('/api/analytics/categories/:category/revenue', getCategoryRevenue as any);
app.get('/api/analytics/customers/:customerId/lifetime-value', getCustomerLtv as any);
app.get('/api/analytics/sync-status', getSyncStatus as any);

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Query Service running on port ${port}`);
});
