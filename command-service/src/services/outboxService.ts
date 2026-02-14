import { query } from '../config/db';
import { publishMessage } from '../config/rabbitmq';

export const startOutboxProcessor = () => {
    setInterval(async () => {
        try {
            const result = await query(
                'SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at ASC LIMIT 10'
            );

            if (result.rows.length > 0) {
                for (const row of result.rows) {
                    try {
                        await publishMessage(row.topic, row.payload);
                        await query('UPDATE outbox SET published_at = NOW() WHERE id = $1', [row.id]);
                        console.log(`Processed outbox event ${row.id}`);
                    } catch (err) {
                        console.error(`Failed to publish event ${row.id}`, err);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing outbox', error);
        }
    }, 2000); // Poll every 2 seconds
};
