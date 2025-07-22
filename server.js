const express = require('express');
const request = require('request');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing "url" query parameter');
    }

    console.log('Proxying:', targetUrl);

    req.pipe(request({
        url: targetUrl,
        headers: {
            'Referer': 'https://appx-play.akamai.net.in/',
            'Origin': 'https://appx-play.akamai.net.in/',
            'User-Agent': req.headers['user-agent'] || ''
        },
        followAllRedirects: true
    })).on('error', (err) => {
        console.error(err);
        res.status(500).send('Error fetching target URL');
    }).pipe(res);
});

app.listen(PORT, () => {
    console.log(`RWA HLS Proxy running on port ${PORT}`);
});