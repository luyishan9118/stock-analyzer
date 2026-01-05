#!/usr/bin/env node
/**
 * Stock Analysis Script
 * Analyzes multiple stocks/ETFs using technical indicators to identify potential buying opportunities
 *
 * Usage: node tesla_stock_analyzer.js
 * Required: npm install yahoo-finance2
 */

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

// Tickers to analyze
const TICKERS = ['TSLA', 'VOO', 'QQQ'];

// Calculate RSI (Relative Strength Index)
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

// Calculate EMA (Exponential Moving Average)
function calculateEMA(prices, periods) {
    const ema = [];
    const multiplier = 2 / (periods + 1);

    // Start with SMA
    let sum = 0;
    for (let i = 0; i < periods; i++) {
        sum += prices[i];
    }
    ema[periods - 1] = sum / periods;

    // Calculate EMA
    for (let i = periods; i < prices.length; i++) {
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
}

// Calculate SMA (Simple Moving Average)
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

// Calculate MACD
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

    // Align signal line with macd array
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

// Calculate Bollinger Bands
function calculateBollingerBands(prices, periods = 20, stdDev = 2) {
    const sma = calculateSMA(prices, periods);
    const upper = [];
    const lower = [];

    for (let i = periods - 1; i < prices.length; i++) {
        // Calculate standard deviation
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

// Calculate average volume
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

// Find 52-week high and low
function find52WeekHighLow(prices) {
    // Use last 252 trading days (approximately 1 year)
    const period = Math.min(252, prices.length);
    const recentPrices = prices.slice(-period);

    return {
        high: Math.max(...recentPrices),
        low: Math.min(...recentPrices)
    };
}

// Find support and resistance levels
function findSupportResistance(prices, volumes) {
    // Look at last 60 days for key levels
    const lookback = Math.min(60, prices.length);
    const recentPrices = prices.slice(-lookback);
    const recentVolumes = volumes.slice(-lookback);

    // Find local peaks and troughs with high volume
    const levels = [];

    for (let i = 2; i < recentPrices.length - 2; i++) {
        const price = recentPrices[i];
        const volume = recentVolumes[i];
        const avgVol = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

        // Check if it's a local peak
        if (price > recentPrices[i-1] && price > recentPrices[i-2] &&
            price > recentPrices[i+1] && price > recentPrices[i+2] &&
            volume > avgVol * 0.8) {
            levels.push({ price, type: 'resistance' });
        }

        // Check if it's a local trough
        if (price < recentPrices[i-1] && price < recentPrices[i-2] &&
            price < recentPrices[i+1] && price < recentPrices[i+2] &&
            volume > avgVol * 0.8) {
            levels.push({ price, type: 'support' });
        }
    }

    // Group similar levels (within 2%)
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

    // Sort by significance (count)
    grouped.sort((a, b) => b.count - a.count);

    return {
        support: grouped.filter(l => l.type === 'support').slice(0, 2),
        resistance: grouped.filter(l => l.type === 'resistance').slice(0, 2)
    };
}

async function analyzeStock(ticker) {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365); // Get 1 year of data

        const result = await yahooFinance.historical(ticker, {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });

        if (!result || result.length === 0) {
            console.log(`Error: Could not fetch data for ${ticker}`);
            return null;
        }

        // Extract closing prices and volumes
        const closes = result.map(day => day.close);
        const volumes = result.map(day => day.volume);

        // Calculate technical indicators
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const sma200 = calculateSMA(closes, 200);
        const rsi = calculateRSI(closes, 14);
        const { macd, signalLine, histogram } = calculateMACD(closes);
        const bollingerBands = calculateBollingerBands(closes, 20, 2);
        const avgVolume = calculateAverageVolume(volumes, 20);
        const week52 = find52WeekHighLow(closes);
        const srLevels = findSupportResistance(closes, volumes);

        // Get latest values
        const latest = result[result.length - 1];
        const latestIndex = result.length - 1;
        const prevIndex = result.length - 2;
        const currentPrice = latest.close;
        const currentVolume = latest.volume;

        // Print current status
        console.log('\n' + '='.repeat(60));
        console.log(`${ticker} Analysis - ${new Date().toLocaleString()}`);
        console.log('='.repeat(60));
        console.log(`\nCurrent Price: $${currentPrice.toFixed(2)}`);

        // 52-week range
        const distanceFromHigh = ((week52.high - currentPrice) / week52.high * 100);
        const distanceFromLow = ((currentPrice - week52.low) / week52.low * 100);
        console.log(`\n52-Week Range:`);
        console.log(`  High: $${week52.high.toFixed(2)} (${distanceFromHigh.toFixed(1)}% below)`);
        console.log(`  Low:  $${week52.low.toFixed(2)} (${distanceFromLow.toFixed(1)}% above)`);

        console.log('\nMoving Averages:');
        console.log(`  20-day SMA:  $${sma20[latestIndex]?.toFixed(2) || 'N/A'}`);
        console.log(`  50-day SMA:  $${sma50[latestIndex]?.toFixed(2) || 'N/A'}`);
        console.log(`  200-day SMA: $${sma200[latestIndex]?.toFixed(2) || 'N/A'}`);

        // Bollinger Bands
        const bbUpper = bollingerBands.upper[latestIndex];
        const bbLower = bollingerBands.lower[latestIndex];
        const bbPosition = ((currentPrice - bbLower) / (bbUpper - bbLower) * 100);
        console.log(`\nBollinger Bands (20, 2):`)
        console.log(`  Upper: $${bbUpper?.toFixed(2) || 'N/A'}`);
        console.log(`  Lower: $${bbLower?.toFixed(2) || 'N/A'}`);
        console.log(`  Position: ${bbPosition?.toFixed(1) || 'N/A'}% (0%=lower, 100%=upper)`);

        console.log('\nTechnical Indicators:');
        console.log(`  RSI (14):    ${rsi[latestIndex]?.toFixed(2) || 'N/A'}`);
        console.log(`  MACD:        ${macd[latestIndex]?.toFixed(2) || 'N/A'}`);
        console.log(`  Signal Line: ${signalLine[latestIndex]?.toFixed(2) || 'N/A'}`);
        console.log(`  MACD Hist:   ${histogram[latestIndex]?.toFixed(2) || 'N/A'}`);

        // Volume
        const volumeRatio = currentVolume / avgVolume[latestIndex];
        console.log(`\nVolume:`);
        console.log(`  Current: ${(currentVolume / 1000000).toFixed(2)}M`);
        console.log(`  20-day Avg: ${(avgVolume[latestIndex] / 1000000).toFixed(2)}M`);
        console.log(`  Ratio: ${volumeRatio.toFixed(2)}x ${volumeRatio > 1.2 ? '(High ↑)' : volumeRatio < 0.8 ? '(Low ↓)' : '(Normal)'}`);

        // Support and Resistance
        console.log(`\nSupport/Resistance Levels:`);
        if (srLevels.support.length > 0) {
            srLevels.support.forEach((s, i) => {
                console.log(`  Support ${i+1}: $${s.price.toFixed(2)}`);
            });
        }
        if (srLevels.resistance.length > 0) {
            srLevels.resistance.forEach((r, i) => {
                console.log(`  Resistance ${i+1}: $${r.price.toFixed(2)}`);
            });
        }
        if (srLevels.support.length === 0 && srLevels.resistance.length === 0) {
            console.log(`  No strong levels detected`);
        }

        // Analyze buy signals
        console.log('\n' + '='.repeat(60));
        console.log('ANALYSIS');
        console.log('='.repeat(60));

        let buySignals = 0;
        const totalSignals = 8; // Increased from 4 to 8

        // Check RSI (oversold condition)
        const currentRSI = rsi[latestIndex];
        if (currentRSI < 30) {
            console.log('✓ RSI indicates OVERSOLD (< 30) - Strong buy signal');
            buySignals += 1;
        } else if (currentRSI < 40) {
            console.log('→ RSI indicates potential buying opportunity (< 40)');
            buySignals += 0.5;
        } else {
            console.log('✗ RSI not in oversold territory');
        }

        // Check MACD crossover
        const currentMACD = macd[latestIndex];
        const currentSignal = signalLine[latestIndex];
        const prevMACD = macd[prevIndex];
        const prevSignal = signalLine[prevIndex];

        if (currentMACD > currentSignal && prevMACD <= prevSignal) {
            console.log('✓ MACD bullish crossover detected - Buy signal');
            buySignals += 1;
        } else if (currentMACD > currentSignal) {
            console.log('→ MACD above signal line - Bullish');
            buySignals += 0.5;
        } else {
            console.log('✗ MACD below signal line - Bearish');
        }

        // Check moving average trend
        const current20SMA = sma20[latestIndex];
        const current50SMA = sma50[latestIndex];

        if (currentPrice > current20SMA && current20SMA > current50SMA) {
            console.log('✓ Price above 20 and 50-day SMA - Uptrend');
            buySignals += 1;
        } else if (currentPrice < current20SMA && current20SMA < current50SMA) {
            console.log('✗ Price below 20 and 50-day SMA - Downtrend');
        } else {
            console.log('→ Mixed moving average signals');
            buySignals += 0.5;
        }

        // Price vs 200-day SMA (long-term trend)
        const current200SMA = sma200[latestIndex];
        if (currentPrice > current200SMA) {
            console.log('✓ Price above 200-day SMA - Long-term uptrend');
            buySignals += 1;
        } else {
            console.log('✗ Price below 200-day SMA - Long-term downtrend');
        }

        // NEW: Check Bollinger Bands position
        if (bbPosition < 20) {
            console.log('✓ Price near lower Bollinger Band - Oversold signal');
            buySignals += 1;
        } else if (bbPosition < 40) {
            console.log('→ Price in lower half of Bollinger Bands');
            buySignals += 0.5;
        } else if (bbPosition > 80) {
            console.log('✗ Price near upper Bollinger Band - Overbought');
        } else {
            console.log('→ Price in middle of Bollinger Bands');
            buySignals += 0.5;
        }

        // NEW: Check volume confirmation
        if (volumeRatio > 1.2) {
            console.log('✓ High volume - Strong market interest');
            buySignals += 1;
        } else if (volumeRatio > 0.8) {
            console.log('→ Normal volume');
            buySignals += 0.5;
        } else {
            console.log('✗ Low volume - Weak conviction');
        }

        // NEW: Check 52-week position
        if (distanceFromHigh > 20) {
            console.log('✓ More than 20% below 52-week high - Good entry point');
            buySignals += 1;
        } else if (distanceFromHigh > 10) {
            console.log('→ 10-20% below 52-week high');
            buySignals += 0.5;
        } else {
            console.log('✗ Near 52-week high - Limited upside');
        }

        // NEW: Check support/resistance
        const nearSupport = srLevels.support.some(s =>
            Math.abs(currentPrice - s.price) / currentPrice < 0.02
        );
        const nearResistance = srLevels.resistance.some(r =>
            Math.abs(currentPrice - r.price) / currentPrice < 0.02
        );

        if (nearSupport) {
            console.log('✓ Price near support level - Potential bounce');
            buySignals += 1;
        } else if (nearResistance) {
            console.log('✗ Price near resistance - May face selling pressure');
        } else {
            console.log('→ No major support/resistance nearby');
            buySignals += 0.5;
        }

        // Overall recommendation
        console.log('\n' + '='.repeat(60));
        console.log('RECOMMENDATION');
        console.log('='.repeat(60));

        const score = (buySignals / totalSignals) * 100;
        console.log(`\nBuy Signal Strength: ${score.toFixed(1)}%`);

        if (score >= 75) {
            console.log('🟢 STRONG BUY - Multiple positive indicators');
        } else if (score >= 50) {
            console.log('🟡 MODERATE BUY - Some positive signals, proceed with caution');
        } else if (score >= 25) {
            console.log('🟠 HOLD - Mixed signals, not ideal for buying');
        } else {
            console.log('🔴 AVOID - Bearish indicators, wait for better entry point');
        }

        console.log('='.repeat(60) + '\n');

        return { ticker, score, currentPrice };

    } catch (error) {
        console.error(`Error analyzing ${ticker}:`, error.message);
        return null;
    }
}

async function analyzeAll() {
    console.log('\n🔍 Starting Stock Analysis...\n');
    console.log(`Analyzing: ${TICKERS.join(', ')}\n`);

    const results = [];

    for (const ticker of TICKERS) {
        const result = await analyzeStock(ticker);
        if (result) {
            results.push(result);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('');

    results.sort((a, b) => b.score - a.score);

    results.forEach((result, index) => {
        let emoji = '🔴';
        if (result.score >= 75) emoji = '🟢';
        else if (result.score >= 50) emoji = '🟡';
        else if (result.score >= 25) emoji = '🟠';

        console.log(`${index + 1}. ${emoji} ${result.ticker.padEnd(6)} $${result.currentPrice.toFixed(2).padStart(8)} - Signal: ${result.score.toFixed(1)}%`);
    });

    console.log('\n⚠️  DISCLAIMER: This is for educational purposes only.');
    console.log('    Not financial advice. Always do your own research.');
    console.log('='.repeat(60) + '\n');
}

// Run the analysis
analyzeAll();
