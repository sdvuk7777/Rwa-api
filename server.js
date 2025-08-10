const puppeteer = require("puppeteer");

async function extractOtpUrl(pageUrl) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let otpUrl = null;

    page.on("request", (request) => {
        const reqUrl = request.url();
        if (reqUrl.includes("pw-api1-ab3091004643.herokuapp.com/api/otp")) {
            otpUrl = reqUrl;
            console.log("Found OTP URL:", otpUrl);
        }
    });

    await page.goto(pageUrl, { waitUntil: "networkidle2" });

    await browser.close();
    return otpUrl;
}

(async () => {
    const targetUrl = "https://pwthor.site/pwplayer.html?encrypted=6%2FDnCaTLsTIMV9evnvxI8hlADv%2B3qcvIBfzPSRkboRpVwel4sjVW4jfXhwSyRxFghZa1I3JYmhVewRCxWHksVbudHXF2hHtlnBID7m6RPSu186fGbA2IHpDW%2Be7oJg3iTR%2FYZj%2Fx2R%2FpUdsKRylwFmNVsz8oBV%2F8EGOk3qaxjQnzwe54UvTc32bWj93vbpFAdhjnZe51xwoqklN%2BBpMbdigGYsIQt5JjKH26fmR6xY05KjCnaJxaoPoxy%2BcSu7wPiINZAyWSEs7EnZEE6Vw6RgnutFqpbMiIP4o%2B3Kex6QuL5u6W2p6kCHC48KX5zZ%2BpHr%2BGXeKdsmNio0EKnMK%2Bswkn173mqAlKORzwtlSVFuuynlSJxBKzx5iffEeEDAZoauxjvNRhDlKwJF5QUyKITlSffa%2Fuc1xFH1aozhQGLD2cVKRRuqFECyjNuKj3hgC9&iv=FtvrBj3Xmd%2FRajiFFe1ncQ%3D%3D";
    const otp = await extractOtpUrl(targetUrl);
    if (!otp) {
        console.log("OTP URL not found.");
    }
})();