import amqp, { Connection, Channel } from 'amqplib';

let connection: any;
let channel: Channel;

export const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.BROKER_URL || 'amqp://guest:guest@localhost:5672';
        connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertExchange('ecommerce_events', 'topic', { durable: true });
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ', error);
        // Retry logic could be added here
        setTimeout(connectRabbitMQ, 5000);
    }
};

export const getChannel = () => channel;

export const publishMessage = async (routingKey: string, message: any) => {
    if (!channel) {
        console.error('RabbitMQ channel not initialized');
        return;
    }
    channel.publish('ecommerce_events', routingKey, Buffer.from(JSON.stringify(message)));
    console.log(`Published message to ${routingKey}`);
};
