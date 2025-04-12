// Required modules
const fs = require('fs-jetpack');
const path = require('path');
const { chromium } = require('playwright');
const { Configuration, OpenAIApi } = require('openai');
const Apify = require('apify');

// Main logic
Apify.main(async () => {
    const input = await Apify.getInput();
    const { videoUrl, commentPrompt, openaiApiKey } = input;

    // Init OpenAI
    const configuration = new Configuration({ apiKey: openaiApiKey });
    const openai = new OpenAIApi(configuration);

    // Launch browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Load saved cookies if available
    const storedCookies = await Apify.getValue('cookies');
    if (storedCookies) {
        await context.addCookies(storedCookies);
        console.log('✅ Cookies loaded');
    }

    // Go to login page if no cookies
    await page.goto('https://www.tiktok.com/login');
    console.log('⏳ Waiting for manual login...');
    await page.waitForTimeout(30000); // Manual login window

    // Save cookies after login
    const cookies = await context.cookies();
    await Apify.setValue('cookies', cookies);
    console.log('✅ Cookies saved');

    // Go to video and wait for full load
    await page.goto(videoUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Select comment input box and click it
    const commentBoxSelector = 'div.public-DraftEditor-content';
    await page.click(commentBoxSelector);

    // Generate AI comment
    const commentText = await generateComment(openai, commentPrompt);
    await page.keyboard.type(commentText);
    await page.keyboard.press('Enter');

    console.log('✅ Comment posted:', commentText);

    await browser.close();
});

// Function to call OpenAI and generate comment
async function generateComment(openai, prompt) {
    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: `Write a convincing comment to generate leads for this: ${prompt}`,
            temperature: 0.7,
            max_tokens: 60,
        });

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('❌ Error generating comment:', error.message);
        return '🔥 Must see! Changed my game!';
    }
}
