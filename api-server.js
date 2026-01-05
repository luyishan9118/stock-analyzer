const express = require('express');
const cors = require('cors');
const YahooFinance = require('yahoo-finance2').default;

const app = express();
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

app.use(cors());
app.use(express.json());

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

function calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    const emaFast = calculateEMA(prices, fast);
    const emaSlow = calculateEMA(prices, slow);
    const macd = [];
    for (let i = 0; i < prices.length; i++) {
        if (emaFast[i] !== undefined && emaSlow[i] !== undefined) {
            macd[i] = emaFast[i] - emaSlow[i];
        }
    }
    const signalLine = calculateEMA(macd.filter(v => v !== undefined), signal);
    const alignedSignal = new Array(macd.length);
    let signalIndex = 0;
    for (let i = 0; i < macd.length; i++) {
        if (macd[i] !== undefined && signalIndex < signalLine.length) {
            if (signalIndex >= signal - 1) {
                alignedSignal[i] = signalLine[signalIndex];
            }
            signalIndex++;
        }
    }
    const histogram = [];
    for (let i = 0; i < macd.length; i++) {
        if (macd[i] !== undefined && alignedSignal[i] !== undefined) {
            histogram[i] = macd[i] - alignedSignal[i];
        }
    }
    return { macd, signalLine: alignedSignal, histogram };
}

function calculateBollingerBands(prices, periods = 20, stdDev = 2) {
    const sma = calculateSMA(prices, periods);
    const upper = [];
    const lower = [];
    for (let i = periods - 1; i < prices.length; i++) {
        let sum = 0;
        for (let j = i - periods + 1; j <= i; j++) {
            sum += Math.pow(prices[j] - sma[i], 2);
        }
        const std = Math.sqrt(sum / periods);
        upper[i] = sma[i] + (std * stdDev);
        lower[i] = sma[i] - (std * stdDev);
    }
    return { upper, middle: sma, lower };
}

function calculateAverageVolume(volumes, periods = 20) {
    const avgVol = [];
    for (let i = periods - 1; i < volumes.length; i++) {
        let sum = 0;
        for (let j = i - periods + 1; j <= i; j++) {
            sum += volumes[j];
        }
        avgVol[i] = sum / periods;
    }
    return avgVol;
}

function find52WeekHighLow(prices) {
    const period = Math.min(252, prices.length);
    const recentPrices = prices.slice(-period);
    return {
        high: Math.max(...recentPrices),
        low: Math.min(...recentPrices)
    };
}

function findSupportResistance(prices, volumes) {
    const lookback = Math.min(60, prices.length);
    const recentPrices = prices.slice(-lookback);
    const recentVolumes = volumes.slice(-lookback);
    const levels = [];

    for (let i = 2; i < recentPrices.length - 2; i++) {
        const price = recentPrices[i];
        const volume = recentVolumes[i];
        const avgVol = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

        if (price > recentPrices[i-1] && price > recentPrices[i-2] &&
            price > recentPrices[i+1] && price > recentPrices[i+2] &&
            volume > avgVol * 0.8) {
            levels.push({ price, type: 'resistance' });
        }

        if (price < recentPrices[i-1] && price < recentPrices[i-2] &&
            price < recentPrices[i+1] && price < recentPrices[i+2] &&
            volume > avgVol * 0.8) {
            levels.push({ price, type: 'support' });
        }
    }

    const grouped = [];
    levels.forEach(level => {
        const existing = grouped.find(g =>
            Math.abs(g.price - level.price) / level.price < 0.02 &&
            g.type === level.type
        );
        if (existing) {
            existing.count = (existing.count || 1) + 1;
            existing.price = (existing.price + level.price) / 2;
        } else {
            grouped.push({ ...level, count: 1 });
        }
    });

    grouped.sort((a, b) => b.count - a.count);
    return {
        support: grouped.filter(l => l.type === 'support').slice(0, 2),
        resistance: grouped.filter(l => l.type === 'resistance').slice(0, 2)
    };
}

// API endpoint to analyze stock
app.post('/api/analyze', async (req, res) => {
    try {
        const { tickers } = req.body;

        if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
            return res.status(400).json({ error: 'Please provide at least one ticker' });
        }

        const results = [];

        for (const ticker of tickers) {
            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 365);

                const result = await yahooFinance.historical(ticker, {
                    period1: startDate,
                    period2: endDate,
                    interval: '1d'
                });

                if (!result || result.length === 0) {
                    results.push({
                        ticker,
                        error: 'Could not fetch data'
                    });
                    continue;
                }

                const closes = result.map(day => day.close);
                const volumes = result.map(day => day.volume);

                const sma20 = calculateSMA(closes, 20);
                const sma50 = calculateSMA(closes, 50);
                const sma200 = calculateSMA(closes, 200);
                const rsi = calculateRSI(closes, 14);
                const { macd, signalLine } = calculateMACD(closes);
                const bollingerBands = calculateBollingerBands(closes, 20, 2);
                const avgVolume = calculateAverageVolume(volumes, 20);
                const week52 = find52WeekHighLow(closes);
                const srLevels = findSupportResistance(closes, volumes);

                const latestIndex = result.length - 1;
                const prevIndex = result.length - 2;
                const currentPrice = result[latestIndex].close;
                const currentVolume = result[latestIndex].volume;

                const currentRSI = rsi[latestIndex];
                const currentMACD = macd[latestIndex];
                const currentSignal = signalLine[latestIndex];
                const prevMACD = macd[prevIndex];
                const prevSignal = signalLine[prevIndex];
                const current20SMA = sma20[latestIndex];
                const current50SMA = sma50[latestIndex];
                const current200SMA = sma200[latestIndex];
                const bbUpper = bollingerBands.upper[latestIndex];
                const bbLower = bollingerBands.lower[latestIndex];
                const bbPosition = ((currentPrice - bbLower) / (bbUpper - bbLower) * 100);
                const volumeRatio = currentVolume / avgVolume[latestIndex];
                const distanceFromHigh = ((week52.high - currentPrice) / week52.high * 100);
                const distanceFromLow = ((currentPrice - week52.low) / week52.low * 100);

                // Calculate buy signals
                let buySignals = 0;
                const totalSignals = 8;
                const signals = [];

                // RSI
                if (currentRSI < 30) {
                    buySignals += 1;
                    signals.push('RSI Oversold');
                } else if (currentRSI < 40) {
                    buySignals += 0.5;
                    signals.push('RSI Low');
                }

                // MACD
                if (currentMACD > currentSignal && prevMACD <= prevSignal) {
                    buySignals += 1;
                    signals.push('MACD Bullish Crossover');
                } else if (currentMACD > currentSignal) {
                    buySignals += 0.5;
                    signals.push('MACD Bullish');
                }

                // Moving averages
                if (currentPrice > current20SMA && current20SMA > current50SMA) {
                    buySignals += 1;
                    signals.push('Strong Uptrend');
                } else if (!(currentPrice < current20SMA && current20SMA < current50SMA)) {
                    buySignals += 0.5;
                }

                // 200-day SMA
                if (currentPrice > current200SMA) {
                    buySignals += 1;
                    signals.push('Long-term Uptrend');
                }

                // Bollinger Bands
                if (bbPosition < 20) {
                    buySignals += 1;
                    signals.push('Near Lower BB');
                } else if (bbPosition < 40) {
                    buySignals += 0.5;
                } else if (bbPosition <= 60) {
                    buySignals += 0.5;
                }

                // Volume
                if (volumeRatio > 1.2) {
                    buySignals += 1;
                    signals.push('High Volume');
                } else if (volumeRatio > 0.8) {
                    buySignals += 0.5;
                }

                // 52-week position
                if (distanceFromHigh > 20) {
                    buySignals += 1;
                    signals.push('Far from High');
                } else if (distanceFromHigh > 10) {
                    buySignals += 0.5;
                }

                // Support/Resistance
                const nearSupport = srLevels.support.some(s =>
                    Math.abs(currentPrice - s.price) / currentPrice < 0.02
                );
                const nearResistance = srLevels.resistance.some(r =>
                    Math.abs(currentPrice - r.price) / currentPrice < 0.02
                );

                if (nearSupport) {
                    buySignals += 1;
                    signals.push('Near Support');
                } else if (!nearResistance) {
                    buySignals += 0.5;
                }

                const score = (buySignals / totalSignals) * 100;
                let recommendation = '';
                if (score >= 75) recommendation = 'STRONG BUY';
                else if (score >= 50) recommendation = 'MODERATE BUY';
                else if (score >= 25) recommendation = 'HOLD';
                else recommendation = 'AVOID';

                results.push({
                    ticker,
                    currentPrice: parseFloat(currentPrice.toFixed(2)),
                    score: parseFloat(score.toFixed(1)),
                    recommendation,
                    signals: signals.join(', ') || 'None',
                    rsi: currentRSI ? parseFloat(currentRSI.toFixed(2)) : null,
                    macd: currentMACD ? parseFloat(currentMACD.toFixed(2)) : null,
                    sma20: current20SMA ? parseFloat(current20SMA.toFixed(2)) : null,
                    sma50: current50SMA ? parseFloat(current50SMA.toFixed(2)) : null,
                    sma200: current200SMA ? parseFloat(current200SMA.toFixed(2)) : null,
                    bbUpper: bbUpper ? parseFloat(bbUpper.toFixed(2)) : null,
                    bbLower: bbLower ? parseFloat(bbLower.toFixed(2)) : null,
                    bbPosition: bbPosition ? parseFloat(bbPosition.toFixed(1)) : null,
                    volume: (currentVolume / 1000000).toFixed(2) + 'M',
                    avgVolume: (avgVolume[latestIndex] / 1000000).toFixed(2) + 'M',
                    volumeRatio: parseFloat(volumeRatio.toFixed(2)),
                    week52High: parseFloat(week52.high.toFixed(2)),
                    week52Low: parseFloat(week52.low.toFixed(2)),
                    distanceFromHigh: parseFloat(distanceFromHigh.toFixed(1)),
                    distanceFromLow: parseFloat(distanceFromLow.toFixed(1)),
                    support: srLevels.support.map(s => s.price.toFixed(2)).join(', ') || 'None',
                    resistance: srLevels.resistance.map(r => r.price.toFixed(2)).join(', ') || 'None'
                });

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
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ API server running on http://localhost:${PORT}`);
});
