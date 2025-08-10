import express from "express";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/get-otp", async (req, res) => {
    const pageUrl = req.query.url;
    if (!pageUrl) return res.status(400).json({ error: "Missing 'url' query parameter" });

    let browser;
    let otpUrl = null;

    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Listen to all requests (main frame + iframes)
        const captureRequest = (request) => {
            const url = request.url();
            if (url.includes("pw-api1-ab3091004643.herokuapp.com/api/otp")) {
                otpUrl = url;
            }
        };

        page.on("request", captureRequest);

        page.on("frameattached", (frame) => {
            frame.page().on("request", captureRequest);
        });

        // Go to page and wait for network idle
        await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 0 });

        // Wait max 20s for OTP request
        const start = Date.now();
        while (!otpUrl && Date.now() - start < 20000) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await browser.close();

        if (otpUrl) {
            res.json({ otpUrl });
        } else {
            res.status(404).json({ error: "OTP URL not found (timeout)" });
        }

    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));