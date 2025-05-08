const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Proper CORS configuration
app.use(cors({
  origin: 'https://meepansewa.co.in',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Handle preflight OPTIONS requests for all routes
app.options('*', cors());

app.use(bodyParser.json());

// ✅ Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Hello from API!' });
});

// ✅ Main Playwright POST route
app.post('/api', async (req, res) => {
  const { rationCard } = req.body;

  if (!rationCard) {
    return res.status(400).json({ error: 'Ration Card number required' });
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // ✅ For Render
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // ✅ Replace this with your actual automation steps
    await page.goto('https://epds.telangana.gov.in/FoodSecurityAct/');
    const title = await page.title();

    await browser.close();

    res.json({ message: 'Automation successful', title });
  } catch (error) {
    console.error('❌ Playwright error:', error);
    res.status(500).json({
      error: 'Automation failed',
      details: error.message
    });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
