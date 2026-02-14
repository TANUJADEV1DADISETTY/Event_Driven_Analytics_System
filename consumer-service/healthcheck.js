// Simple healthcheck that returns success if the process is running
// In a real app, this might check RabbitMQ connection status
console.log('Healthcheck passed');
process.exit(0);
