const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright'); // ✅ Playwright import

const app = express();
const PORT = process.env.PORT || 3000;

// CORS to allow frontend to access this API
app.use(cors({
  origin: 'https://meepansewa.co.in',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// ✅ Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Hello from API!' });
});

// ✅ Playwright automation endpoint
app.post('/api', async (req, res) => {
  const { rationCard } = req.body;

  if (!rationCard) {
    return res.status(400).json({ error: 'Ration Card number required' });
  }

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Example: Load a dummy page (replace this with your target site)
    await page.goto('https://example.com');

    // Example: Capture page title
    const title = await page.title();

    await browser.close();

    res.json({ message: 'Automation successful', title });
  } catch (error) {
    console.error('❌ Playwright error:', error);
    res.status(500).json({ error: 'Automation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
