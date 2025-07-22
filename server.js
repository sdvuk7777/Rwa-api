const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing "url" query parameter');
    }

    console.log('Proxying:', targetUrl);

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'stream',
            headers: {
                'Referer': 'https://appx-play.akamai.net.in/',
                'Origin': 'https://appx-play.akamai.net.in/',
                'User-Agent': req.headers['user-agent'] || ''
            },
            maxRedirects: 5
        });

        res.set(response.headers);
        response.data.pipe(res);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Proxy fetch failed: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`RWA HLS Proxy running on port ${PORT}`);
});