import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/get-otp", async (req, res) => {
    const pageUrl = req.query.url;

    if (!pageUrl) {
        return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        let otpUrl = null;

        // Capture all requests
        page.on("request", (request) => {
            if (request.url().includes("pw-api1-ab3091004643.herokuapp.com/api/otp")) {
                otpUrl = request.url();
            }
        });

        await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 0 });

        await browser.close();

        if (otpUrl) {
            res.json({ otpUrl });
        } else {
            res.status(404).json({ error: "OTP URL not found" });
        }

    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});