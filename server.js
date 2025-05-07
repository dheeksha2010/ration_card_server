const express = require('express');
const cors = require('cors');
const app = express();

// ✅ Allow requests from your domain
app.use(cors({
  origin: 'https://meepansewa.co.in',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
