import { Actor } from 'apify';
import { chromium } from 'playwright';
import OpenAI from 'openai';
import fs from 'fs-jetpack';
import path from 'path';

await Actor.init();

const input = await Actor.getInput();
const { videoUrl, commentPrompt, openaiApiKey } = input;

// Init OpenAI
const openai = new OpenAI({ apiKey: openaiApiKey });

// Launch browser
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Load saved cookies if available
const storedCookies = await Actor.getValue('cookies');
if (storedCookies) {
    await context.addCookies(storedCookies);
    console.log('✅ Cookies loaded');
}

// Go to login page (only first time)
await page.goto('https://www.tiktok.com/login');
console.log('⏳ Waiting for manual login...');
await page.waitForTimeout(30000); // Manual login

// Save cookies for next runs
const cookies = await context.cookies();
await Actor.setValue('cookies', cookies);
console.log('✅ Cookies saved');

// Go to the video and wait for full load
await page.goto(videoUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);

// Click into the comment input
const commentBoxSelector = 'div.public-DraftEditor-content';
await page.click(commentBoxSelector);

// Generate comment with OpenAI
const commentText = await generateComment(openai, commentPrompt);
await page.keyboard.type(commentText);
await page.keyboard.press('Enter');

console.log('✅ Comment posted:', commentText);

// Close browser and exit actor
await browser.close();
await Actor.exit();


// Helper: AI comment generator
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
