const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

// Stock analysis functions
function calculateRSI(prices, periods = 14) {
    const rsi = [];
    for (let i = periods; i < prices.length; i++) {
        let gains = 0;
        let losses = 0;
        for (let j = i - periods; j < i; j++) {
            const change = prices[j + 1] - prices[j];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        const avgGain = gains / periods;
        const avgLoss = losses / periods;
        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
    }
    return rsi;
}

function calculateEMA(prices, periods) {
    const ema = [];
    const multiplier = 2 / (periods + 1);
    let sum = 0;
    for (let i = 0; i < periods; i++) {
        sum += prices[i];
    }
    ema[periods - 1] = sum / periods;
    for (let i = periods; i < prices.length; i++) {
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
}

function calculateSMA(prices, periods) {
    const sma = [];
    for (let i = periods - 1; i < prices.length; i++) {
        let sum = 0;
        for (let j = i - periods + 1; j <= i; j++) {
            sum += prices[j];
        }
        sma[i] = sum / periods;
    }
    return sma;
}

function calculateMACD(prices) {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = [];
    for (let i = 0; i < prices.length; i++) {
        if (ema12[i] !== undefined && ema26[i] !== undefined) {
            macd[i] = ema12[i] - ema26[i];
        }
    }
    return macd;
}

function calculateBollingerBands(prices, periods = 20, stdDev = 2) {
    const sma = calculateSMA(prices, periods);
    const upper = [];
    const lower = [];
    for (let i = periods - 1; i < prices.length; i++) {
        let sumSquaredDiff = 0;
        for (let j = i - periods + 1; j <= i; j++) {
            sumSquaredDiff += Math.pow(prices[j] - sma[i], 2);
        }
        const standardDeviation = Math.sqrt(sumSquaredDiff / periods);
        upper[i] = sma[i] + (stdDev * standardDeviation);
        lower[i] = sma[i] - (stdDev * standardDeviation);
    }
    return { upper, lower, sma };
}

function findSupportResistance(prices, volumes) {
    const priceVolume = prices.map((price, i) => ({ price, volume: volumes[i] || 0 }));
    priceVolume.sort((a, b) => b.volume - a.volume);
    const topVolumeLevels = priceVolume.slice(0, Math.min(10, priceVolume.length));
    topVolumeLevels.sort((a, b) => a.price - b.price);
    const currentPrice = prices[prices.length - 1];
    const support = topVolumeLevels.filter(level => level.price < currentPrice);
    const resistance = topVolumeLevels.filter(level => level.price > currentPrice);
    return {
        support: support.length > 0 ? support[support.length - 1].price : null,
        resistance: resistance.length > 0 ? resistance[0].price : null
    };
}

async function analyzeStock(ticker) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const result = await yahooFinance.historical(ticker, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
        interval: '1d'
    });

    if (!result || result.length === 0) {
        throw new Error(`No data found for ${ticker}`);
    }

    const prices = result.map(item => item.close);
    const volumes = result.map(item => item.volume);
    const currentPrice = prices[prices.length - 1];

    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const bb = calculateBollingerBands(prices);

    const currentRSI = rsi[rsi.length - 1];
    const currentMACD = macd[macd.length - 1];
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    const currentSMA200 = sma200[sma200.length - 1];
    const currentBBUpper = bb.upper[bb.upper.length - 1];
    const currentBBLower = bb.lower[bb.lower.length - 1];

    const bbPosition = ((currentPrice - currentBBLower) / (currentBBUpper - currentBBLower)) * 100;

    const currentVolume = volumes[volumes.length - 1];
    const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeRatio = (currentVolume / avgVolume20).toFixed(2);

    const week52High = Math.max(...prices.slice(-252));
    const week52Low = Math.min(...prices.slice(-252));
    const distanceFromHigh = (((week52High - currentPrice) / week52High) * 100).toFixed(2);
    const distanceFromLow = (((currentPrice - week52Low) / week52Low) * 100).toFixed(2);

    const supportResistance = findSupportResistance(prices, volumes);

    let score = 0;
    let signals = [];

    if (currentRSI < 30) {
        score += 25;
        signals.push('RSI Oversold');
    } else if (currentRSI > 70) {
        score -= 15;
        signals.push('RSI Overbought');
    }

    if (currentMACD > 0) {
        score += 20;
        signals.push('Positive MACD');
    }

    if (currentPrice > currentSMA20 && currentPrice > currentSMA50) {
        score += 20;
        signals.push('Above Short-term MAs');
    }

    if (currentSMA20 > currentSMA50 && currentSMA50 > currentSMA200) {
        score += 15;
        signals.push('Long-term Uptrend');
    }

    if (volumeRatio > 1.2) {
        score += 10;
        signals.push('High Volume');
    }

    if (bbPosition < 20) {
        score += 15;
        signals.push('Near Lower BB');
    } else if (bbPosition > 80) {
        score -= 10;
    }

    if (supportResistance.support && currentPrice <= supportResistance.support * 1.02) {
        score += 10;
        signals.push('Near Support');
    }

    if (distanceFromLow > 5 && distanceFromHigh > 30) {
        score += 10;
        signals.push('Recovery Potential');
    }

    let recommendation;
    if (score >= 75) {
        recommendation = 'STRONG BUY';
    } else if (score >= 50) {
        recommendation = 'MODERATE BUY';
    } else if (score >= 25) {
        recommendation = 'HOLD';
    } else {
        recommendation = 'AVOID';
    }

    return {
        ticker,
        currentPrice: currentPrice.toFixed(2),
        score,
        recommendation,
        signals: signals.join(', ') || 'None',
        rsi: currentRSI ? currentRSI.toFixed(2) : '-',
        macd: currentMACD ? currentMACD.toFixed(2) : '-',
        sma20: currentSMA20 ? currentSMA20.toFixed(2) : '-',
        sma50: currentSMA50 ? currentSMA50.toFixed(2) : '-',
        sma200: currentSMA200 ? currentSMA200.toFixed(2) : '-',
        bbUpper: currentBBUpper ? currentBBUpper.toFixed(2) : '-',
        bbLower: currentBBLower ? currentBBLower.toFixed(2) : '-',
        bbPosition: bbPosition ? bbPosition.toFixed(0) : '-',
        volume: currentVolume ? currentVolume.toLocaleString() : '-',
        avgVolume: avgVolume20 ? Math.round(avgVolume20).toLocaleString() : '-',
        volumeRatio,
        week52High: week52High.toFixed(2),
        week52Low: week52Low.toFixed(2),
        distanceFromHigh,
        distanceFromLow,
        support: supportResistance.support ? supportResistance.support.toFixed(2) : 'None',
        resistance: supportResistance.resistance ? supportResistance.resistance.toFixed(2) : 'None'
    };
}

// Vercel serverless function handler
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { tickers } = req.body;

        if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
            return res.status(400).json({ error: 'Please provide an array of stock tickers' });
        }

        const results = [];

        for (const ticker of tickers) {
            try {
                const analysis = await analyzeStock(ticker);
                results.push(analysis);
            } catch (error) {
                results.push({
                    ticker,
                    error: error.message
                });
            }
        }

        res.json({ results });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
