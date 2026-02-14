import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRabbitMQ } from './config/rabbitmq';
import { createProduct } from './controllers/productController';
import { createOrder } from './controllers/orderController';
import { startOutboxProcessor } from './services/outboxService';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.post('/api/products', createProduct as any);
app.post('/api/orders', createOrder as any);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const startServer = async () => {
  // Connect to RabbitMQ (can be async, not blocking server start but good to have)
  connectRabbitMQ().then(() => {
    // Start Outbox Processor
    startOutboxProcessor();
  });

  app.listen(port, () => {
    console.log(`Command Service running on port ${port}`);
  });
};

startServer();
