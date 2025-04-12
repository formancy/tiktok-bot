import { Actor } from 'apify';
import { chromium } from 'playwright';
import OpenAI from 'openai';
import fs from 'fs';
import fsJetpack from 'fs-jetpack';
import path from 'path';

await Actor.init();

// Load input from Apify or local input.json
let input;
if (process.env.APIFY_LOCAL_STORAGE_DIR) {
    input = await Actor.getInput();
} else {
    input = JSON.parse(fs.readFileSync('input.json', 'utf-8'));
}

const { videoUrl, commentPrompt, openaiApiKey } = input;

// Init OpenAI
const openai = new OpenAI({ apiKey: openaiApiKey });

// Launch browser
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

// Load saved cookies if available
let storedCookies;
if (process.env.APIFY_LOCAL_STORAGE_DIR) {
    storedCookies = await Actor.getValue('cookies');
} else if (fsJetpack.exists('cookies.json')) {
    storedCookies = JSON.parse(fsJetpack.read('cookies.json'));
}
if (storedCookies) {
    await context.addCookies(storedCookies);
    console.log('✅ Cookies loaded');
}

// Go to login page if no cookies
await page.goto('https://www.tiktok.com/login');
console.log('⏳ Waiting for manual login...');
await page.waitForTimeout(30000); // wait for manual login

// Save cookies after login
const cookies = await context.cookies();
if (process.env.APIFY_LOCAL_STORAGE_DIR) {
    await Actor.setValue('cookies', cookies);
} else {
    fsJetpack.write('cookies.json', cookies);
}
console.log('✅ Cookies saved');

// Navigate to the video
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

// Cleanup
await browser.close();
await Actor.exit();


// 🔧 Helper function: Generate comment with OpenAI
async function generateComment(openai, prompt) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a persuasive copywriter focused on lead generation.' },
                { role: 'user', content: `Write a comment to generate leads: ${prompt}` },
            ],
            temperature: 0.7,
            max_tokens: 60,
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('❌ Error generating comment:', error.message);
        return '🔥 Must see! Changed my game!';
    }
}
