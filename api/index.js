module.exports = (req, res) => {
  res.json({
    message: 'Stock Analyzer API is running!',
    endpoints: {
      analyze: '/api/analyze (POST)',
      usage: 'Send POST request with body: {"tickers": ["TSLA", "AAPL"]}'
    }
  });
};
