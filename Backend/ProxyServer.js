const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const port = 4027

const app = express();
app.use(cors());

app.get('/aircraft', async (req, res) => {
    const { lat, lon, dist } = req.query;

    if (!lat || !lon || !dist) {
        console.warn('Missing query parameters:', req.query);
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
    
    console.log('Fetching:', url);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error('ADSB.lol response:', response.status, response.statusText);
            return res.status(response.status).json({ error: response.statusText });
            
        }

        const data = await response.json();
        console.log('Successfully fetched data from ADSB.lol');
        res.json(data);

    } catch (err) {
        console.error('Proxy fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch from ADSB.lol', detail: err.message });

    }
});

app.listen(port, () => console.log(`Proxy server running at http://localhost:${port}`));