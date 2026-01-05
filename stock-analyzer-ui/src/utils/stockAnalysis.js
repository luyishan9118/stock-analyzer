// Main analysis function - calls backend API
export async function analyzeStocks(tickers) {
    try {
        const response = await fetch('http://localhost:3001/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tickers }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch analysis data');
        }

        const data = await response.json();

        // Add key for table
        return data.results.map(result => ({
            ...result,
            key: result.ticker
        }));
    } catch (error) {
        throw new Error(`Analysis failed: ${error.message}`);
    }
}
