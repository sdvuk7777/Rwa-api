import express from "express";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/get-otp", async (req, res) => {
    const pageUrl = req.query.url;
    if (!pageUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
        const browser = await puppeteer.launch({
            executablePath: "/usr/bin/chromium-browser", // apne server ka chromium path
            headless: true
        });

        const page = await browser.newPage();
        let otpUrl = null;

        page.on("request", (request) => {
            if (request.url().includes("pw-api1-ab3091004643.herokuapp.com/api/otp")) {
                otpUrl = request.url();
            }
        });

        await page.goto(pageUrl, { waitUntil: "networkidle2" });
        await browser.close();

        if (otpUrl) {
            res.json({ otpUrl });
        } else {
            res.status(404).json({ error: "OTP URL not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});