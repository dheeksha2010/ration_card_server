const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright'); // ✅ Playwright import

const app = express();

// Use Render's dynamic port
const PORT = process.env.PORT || 10000;

// ✅ CORS - Allow frontend domain
app.use(cors({
  origin: 'https://meepansewa.co.in',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// ✅ Test GET endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Hello from API!' });
});

// ✅ POST endpoint for automation using Playwright
app.post('/api', async (req, res) => {
  const { rationCard } = req.body;

  if (!rationCard) {
    return res.status(400).json({ error: 'Ration Card number required' });
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // ✅ Required for Render
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // TODO: Replace with your actual navigation + logic
   await page.goto('https://epds.telangana.gov.in/FoodSecurityAct/');
    const title = await page.title();

    await browser.close();

    res.json({ message: 'Automation successful', title });
  } catch (error) {
    console.error('❌ Playwright error:', error);
    res.status(500).json({ error: 'Automation failed', details: error.message });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
