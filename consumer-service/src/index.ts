import amqp, { Connection, Channel } from 'amqplib';
import { handleOrderCreated, handleProductCreated } from './services/viewUpdater';

export const startConsumer = async () => {
    try {
        const amqpServer = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();

        const exchange = 'ecommerce_events';
        await channel.assertExchange(exchange, 'topic', { durable: true });

        const q = await channel.assertQueue('analytics_queue', { durable: true });

        // Bind to all relevant topics
        await channel.bindQueue(q.queue, exchange, 'order_events');
        await channel.bindQueue(q.queue, exchange, 'product_events');

        console.log('Waiting for messages in %s. To exit press CTRL+C', q.queue);

        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                // The content itself is the payload from outbox, which was stored as JSON string.
                // Wait, outbox payload is JSONB. 
                // In productController: 'INSERT INTO outbox ... VALUES ($1, $2)', [..., JSON.stringify(payload)]
                // So payload in DB is a JSON object.
                // When read by outboxService/pg, it is an object.
                // When sent to RMQ: Buffer.from(JSON.stringify(message))
                // So here content is the object { eventType: ..., ... }

                // We need a unique ID for idempotency. 
                // The message from outbox service should ideally carry the Outbox ID or we can use msg.properties.messageId if set.
                // But outboxService isn't setting messageId.
                // Let's assume we can generate a deterministic ID from content or use a field in content if available.
                // Actually, `outbox` table has `id`. We didn't include it in the published message.
                // Mistake in outboxService.ts: it publishes `row.payload`. It should probably wrap it or include metadata.
                // But wait, `row.payload` has `orderId` or `productId`. Combined with `eventType`, that's unique enough for business logic idempotency.
                // OR proper usage: `outboxService` should publish { eventId: row.id, ...row.payload }.
                // I'll stick to using `content` as payload. I'll need to generate a unique key.
                // For OrderCreated: `order_${content.orderId}`
                // For ProductCreated: `product_${content.productId}`

                const eventType = content.eventType;
                let eventId = '';

                if (eventType === 'OrderCreated') {
                    eventId = `order_${content.orderId}`;
                    await handleOrderCreated(content, eventId);
                } else if (eventType === 'ProductCreated') {
                    eventId = `product_${content.productId}`;
                    await handleProductCreated(content, eventId);
                }

                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Failed to start consumer', error);
        setTimeout(startConsumer, 5000);
    }
};
