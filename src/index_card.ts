import { scrapeNews } from './scraper.js';
import { generateNewsCard } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { isAlreadyPosted, recordPosted } from './history.js';
import { sendCardToWebhook } from './webhook.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { uploadImage } from './cloudinaryService.js';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVV NEWS CARD GENERATOR (STATIC GRAPHIC) ---');

        // 1. Scrape News — using smart check (URL + Title)
        const articles = await scrapeNews(1, isAlreadyPosted);
        if (articles.length === 0) {
            console.log('No fresh articles found. Terminating to avoid duplication.');
            return;
        }
        const article = articles[0]!;
        console.log(`Using article from ${article.source}: ${article.title}`);

        // 2. Extract Data & Image
        const detailedData = await extractArticleData(article.url);

        // Prepare Public Dir
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // Download Image
        let bgImage = 'background_card.png';
        const imageUrl = detailedData.images[0];

        if (!imageUrl) {
            console.log('No suitable article image found. Using high-quality fallback.');
            bgImage = 'background.png';
        } else {
            try {
                console.log(`Downloading background image: ${imageUrl}`);
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TVVBot/1.0)' }
                });
                const contentType = imgRes.headers['content-type'] || '';
                if (contentType.startsWith('image/') && imgRes.data.byteLength > 5000) {
                    fs.writeFileSync(path.join(publicDir, bgImage), Buffer.from(imgRes.data));
                } else {
                    bgImage = 'background.png';
                }
            } catch (e) {
                bgImage = 'background.png';
            }
        }

        // 3. Generate "News Card" Script
        const cardScript = await generateNewsCard(detailedData.content || article.title);

        // 4. Render Static Image
        const outputDir = path.join(process.cwd(), 'out');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputLocation = path.join(outputDir, 'card.png');

        const props = {
            category: cardScript.category,
            headline: cardScript.headline,
            subHeadline: cardScript.subHeadline,
            backgroundImage: bgImage,
            source: article.source
        };

        const propsFile = path.join(outputDir, 'card_props.json');
        fs.writeFileSync(propsFile, JSON.stringify(props));

        const cmd = `npx remotion still remotion/index.ts NewsCard "${outputLocation}" --props="${propsFile}" --log=info --gl=swiftshader`;
        execSync(cmd, { stdio: 'inherit' });

        // 5. Upload to Cloudinary
        const cardUrl = await uploadImage(outputLocation);

        // 6. Send to Webhook
        const webhookUrl = process.env.MAKE_WEBHOOK_URL_CARD || '';
        await sendCardToWebhook(cardUrl, {
            headline: cardScript.headline,
            facebookDescription: cardScript.facebookDescription,
            category: cardScript.category
        }, webhookUrl);

        // 7. Record as posted with Title normalization
        recordPosted(article.url, article.title, 'card');

        console.log('News Card process complete! 🚀');

    } catch (error) {
        console.error('Card Generation failed:', error);
        process.exit(1);
    }
}

main();
