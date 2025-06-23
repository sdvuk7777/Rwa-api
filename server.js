const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;

// AES decryption function
function decrypt(encryptedBase64) {
    try {
        const enc = Buffer.from(encryptedBase64.split(':')[0], 'base64');
        const key = Buffer.from('638udh3829162018', 'utf8');
        const iv = Buffer.from('fedcba9876543210', 'utf8');

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(enc);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        // Remove padding
        const padding = decrypted[decrypted.length - 1];
        return decrypted.slice(0, -padding).toString('utf8');
    } catch (err) {
        return '';
    }
}

app.get('/video-details', async (req, res) => {
    const { token, userid, course_id, video_id } = req.query;

    if (!token || !userid || !course_id || !video_id) {
        return res.status(400).json({ error: "Missing required query parameters." });
    }

    const headers = {
        "Client-Service": "Appx",
        "source": "website",
        "Auth-Key": "appxapi",
        "Authorization": token,
        "User-ID": userid
    };

    const API_BASE = "https://rozgarapinew.teachx.in";
    const url = `${API_BASE}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=0`;

    try {
        const response = await axios.get(url, { headers });
        const data = response.data.data;

        if (!data) {
            return res.status(404).json({ error: "No data found for this video" });
        }

        const result = {
            title: data.Title || "",
            thumbnail: data.thumbnail || "",
            date_and_time: data.date_and_time || "",
            qualities: {},
            primary_download_url: "",
            youtube_id: ""
        };

        // Decrypt quality-wise links
        if (Array.isArray(data.download_links)) {
            data.download_links.forEach(link => {
                if (link.path) {
                    const q = link.quality || "unknown";
                    result.qualities[q] = decrypt(link.path);
                }
            });
        }

        // Decrypt main download link
        if (data.download_link) {
            result.primary_download_url = decrypt(data.download_link);
        }

        // YouTube ID
        if (data.video_id) {
            result.youtube_id = "https://youtu.be/" + decrypt(data.video_id);
        }

        res.json(result);

    } catch (err) {
        res.status(500).json({ error: `Error occurred: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});