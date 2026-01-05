# Stock Analyzer

A comprehensive stock analysis tool that provides technical indicators and buy/sell signals for global stocks.

## Features

- 📊 **Global Stock Support**: Analyze stocks from US, Hong Kong, Japan, UK, Germany, Canada exchanges
- 📈 **Technical Indicators**: RSI, MACD, Bollinger Bands, Moving Averages, Volume Analysis
- 🌍 **Multi-Language**: Support for 8 languages (English, Chinese, Korean, Japanese, French, Spanish, German)
- 📱 **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices
- 💾 **Observation Lists**: Save and manage multiple watchlists
- 🎯 **Buy Signals**: AI-powered recommendations based on technical analysis

## Tech Stack

### Backend
- Node.js + Express
- yahoo-finance2 for stock data
- CORS enabled

### Frontend
- React 18
- Ant Design (antd)
- react-i18next for internationalization
- react-router-dom

## Project Structure

```
aicode/
├── api-server.js           # Backend API server
├── stock_analyzer.js       # CLI stock analyzer
├── package.json            # Backend dependencies
├── vercel.json            # Vercel deployment config
└── stock-analyzer-ui/     # React frontend
    ├── src/
    │   ├── components/    # React components
    │   ├── i18n/         # Translation files
    │   └── utils/        # Utility functions
    └── public/           # Static assets
```

## Local Development

### Backend
```bash
cd aicode
npm install
node api-server.js
```
Backend runs on http://localhost:3001

### Frontend
```bash
cd stock-analyzer-ui
npm install
npm start
```
Frontend runs on http://localhost:3005

## Deployment

- Backend: Vercel
- Frontend: Vercel

## Supported Stock Exchanges

- 🇺🇸 **US**: NYSE, NASDAQ (e.g., TSLA, AAPL, GOOGL)
- 🇭🇰 **Hong Kong**: HKEX (e.g., 0700.HK, 9988.HK)
- 🇯🇵 **Japan**: TSE (e.g., 7203.T, 6758.T)
- 🇬🇧 **UK**: LSE (e.g., BP.L, HSBA.L)
- 🇩🇪 **Germany**: FSE (e.g., VOW3.DE, DAI.DE)
- 🇨🇦 **Canada**: TSX (e.g., SHOP.TO, TD.TO)

## Disclaimer

This tool is for educational purposes only. Not financial advice. Always do your own research before making investment decisions.

## License

MIT

## Author

Created with ❤️ using Claude Code
