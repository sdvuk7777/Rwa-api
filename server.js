const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();

const PORT = process.env.PORT || 3000;
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const MAX_REQUESTS_PER_TOKEN = 5000;
const REQUEST_DELAY_MS = 4000; // 4 seconds

// Initialize tokens file if not exists
if (!fs.existsSync(TOKENS_FILE)) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify({}));
}

// Token rotation pool
const authTokens = [
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjUxNzA3NyIsImVtYWlsIjoidml2ZWtrYXNhbmE0QGdtYWlsLmNvbSIsInRpbWVzdGFtcCI6MTcyNjkzNzA4OX0.NM1SbOjDFZCLinFi66jKxwRQPgLWFN-_SAMgcPWvfk4",
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjUxNzA3NyIsImVtYWlsIjoidml2ZWtrYXNhbmE0QGdtYWlsLmNvbSIsInRpbWVzdGFtcCI6MTcyNjU2MTM2Nn0.XimZ3jxS_j-7B4BpTUR9ZeeaJ8at-ROfPYMdm0GCf6I"
];

let currentTokenIndex = 0;

function getNextAuthToken() {
    currentTokenIndex = (currentTokenIndex + 1) % authTokens.length;
    return authTokens[currentTokenIndex];
}

// ✅ Improved AES-128-CBC Decryption Function
function decrypt(encryptedBase64) {
    try {
        if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return '';

        const parts = encryptedBase64.split(':');
        if (parts.length < 1) return '';

        const encryptedData = parts[0].trim();

        const enc = Buffer.from(encryptedData, 'base64');
        const key = Buffer.from('638udh3829162018', 'utf8');
        const iv = Buffer.from('fedcba9876543210', 'utf8');

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false);

        let decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);

        // Remove PKCS#7 padding
        const pad = decrypted[decrypted.length - 1];
        if (pad > 0 && pad <= 16) {
            decrypted = decrypted.slice(0, -pad);
        }

        return decrypted.toString('utf8').trim();
    } catch (err) {
        console.error("❌ Decryption error:", err.message);
        return '';
    }
}

// Validate JWT token
function validateToken(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded) return false;

        // Check header
        const header = jwt.decode(token, { complete: true })?.header;
        if (!header || header.typ !== 'JWT') return false;

        // Check payload structure
        if (!decoded.id || !decoded.email || !decoded.timestamp) return false;

        return true;
    } catch (err) {
        return false;
    }
}

// Request Token Management System
async function handleRequestToken(req, res, next) {
    const { token } = req.query;
    
    if (!token) {
        return res.status(400).json({ 
            status: 400,
            error: "Token parameter is required" 
        });
    }

    // Validate token structure
    if (!validateToken(token)) {
        return res.status(400).json({ 
            status: 400,
            error: "Invalid token format" 
        });
    }

    const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE));
    const currentDate = new Date().toISOString().split('T')[0];

    // Initialize token data if not exists
    if (!tokensData[token]) {
        tokensData[token] = {
            count: 0,
            lastRequest: 0,
            dateAdded: currentDate
        };
    } else if (tokensData[token].dateAdded !== currentDate) {
        // Reset counter for new day
        tokensData[token].count = 0;
        tokensData[token].dateAdded = currentDate;
    }

    // Check rate limits
    if (tokensData[token].count >= MAX_REQUESTS_PER_TOKEN) {
        return res.status(429).json({ 
            status: 429,
            error: "Daily request limit exceeded for this token" 
        });
    }

    // Check request delay
    const now = Date.now();
    const timeSinceLastRequest = now - tokensData[token].lastRequest;

    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
        // Implement padding delay
        const delayTime = REQUEST_DELAY_MS - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    // Update token usage
    tokensData[token].count += 1;
    tokensData[token].lastRequest = Date.now();
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensData, null, 2));

    next();
}

// Cleanup old tokens (run daily)
function cleanupTokens() {
    const currentDate = new Date().toISOString().split('T')[0];
    const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE));
    
    for (const token in tokensData) {
        if (tokensData[token].dateAdded !== currentDate) {
            delete tokensData[token];
        }
    }

    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensData, null, 2));
}

// Schedule daily cleanup
setInterval(cleanupTokens, 24 * 60 * 60 * 1000); // Run every 24 hours

// Video Details Endpoint with both systems
app.get('/video-details', handleRequestToken, async (req, res) => {
    const { userid, course_id, video_id } = req.query;

    if (!userid || !course_id || !video_id) {
        return res.status(400).json({ 
            status: 400,
            data: [],
            error: "Missing required query parameters." 
        });
    }

    const headers = {
        "Client-Service": "Appx",
        "source": "website",
        "Auth-Key": "appxapi",
        "Authorization": getNextAuthToken(), // Rotating tokens
        "User-ID": userid
    };

    const API_BASE = "https://rozgarapinew.teachx.in";
    const url = `${API_BASE}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0`;

    try {
        const response = await axios.get(url, { headers });
        const data = response.data.data;

        if (!data) {
            return res.status(404).json({ 
                status: 404,
                data: [],
                error: "No data found for this video" 
            });
        }

        const decryptedPdf1 = data.pdf_link ? decrypt(data.pdf_link) : '';
        const decryptedPdf2 = data.pdf_link2 ? decrypt(data.pdf_link2) : '';

        const videoDetails = {
            title: data.Title || "",
            thumbnail: data.thumbnail || "",
            date_and_time: data.date_and_time || "",
            qualities: {},
            primary_download_url: "",
            youtube_id: "",
            pdf_link: decryptedPdf1,
            pdf_link2: decryptedPdf2
        };

        // Decrypt video download qualities
        if (Array.isArray(data.download_links)) {
            data.download_links.forEach(link => {
                if (link.path) {
                    const quality = link.quality || "unknown";
                    videoDetails.qualities[quality] = decrypt(link.path);
                }
            });
        }

        // Decrypt primary download URL
        if (data.download_link) {
            videoDetails.primary_download_url = decrypt(data.download_link);
        }

        // YouTube ID (if present)
        if (data.video_id) {
            videoDetails.youtube_id = "https://youtu.be/" + decrypt(data.video_id);
        }

        res.json({
            status: 200,
            data: [videoDetails]
        });

    } catch (err) {
        console.error("❌ Error in API:", err.message);
        res.status(500).json({ 
            status: 500,
            data: [],
            error: `Error occurred: ${err.message}` 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    cleanupTokens(); // Initial cleanup
});