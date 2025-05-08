const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://meepansewa.co.in',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.post('/api', (req, res) => {
  console.log('✅ POST /api called with:', req.body);
  res.json({ message: 'Hello from API!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
