import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { handler as scanHandler } from './lambda/scan.mjs';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Allow large image payloads

// Routes
app.get('/', (req, res) => {
    res.send('Heimdall API Gateway is Online 🛡️');
});

// POST /api/scan - Invokes the "Scan" Lambda
app.post('/api/scan', async (req, res) => {
    try {
        // Simulate Lambda Invocation
        const result = await scanHandler(req.body);
        res.status(result.statusCode).json(result.body);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n🚀 Heimdall API Gateway running on http://localhost:${PORT}`);
    console.log(`👉 Endpoint: POST /api/scan`);
});
