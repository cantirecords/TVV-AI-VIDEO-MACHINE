import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface VideoScript {
    headline: string;
    subHeadline: string;
    slides: string[];
    category: string;
    facebookDescription: string;
}

export async function generateScript(content: string): Promise<VideoScript> {
    const prompt = `
        You are a top-tier viral news editor for social media. 
        Transform the following news into a 30-45 second "STORY SLIDESHOW".
        The video has NO voiceover, so the text must be the star.

        OUTPUT REQUIREMENTS:
        1. "headline": An attention-grabbing 3-5 word headline (e.g., "BORDER CRISIS ESCALATES").
        2. "subHeadline": A short, descriptive "leadin" summary (approx 10-15 words) for the video overlay.
        3. "facebookDescription": A viral summary of the news exactly 2 paragraphs long.
           - Paragraph 1: Start with a "HOOK" that grabs attention immediately.
           - Paragraph 2: Provide the "CALL TO ACTION" or the main consequence of the news.
           - The tone must be "UTRGENT" and "VIRAL".
        4. "slides": An array of 4-5 descriptive paragraphs. 
           - Each paragraph should be 25-35 words.
           - Use "Journalistic" and "Dramatic" language.
        5. "category": A specific one-word category (e.g., IMMIGRATION, BORDER, JUSTICE).

        News Content:
        ${content}

        Return a JSON object:
        {
          "category": "ONE WORD",
          "headline": "VIRAL MAIN HEADLINE",
          "subHeadline": "Short video lead...",
          "facebookDescription": "Paragraph 1 here.\n\nParagraph 2 here.",
          "slides": ["Detailed Paragraph 1...", "Detailed Paragraph 2...", "Detailed Paragraph 3...", "Detailed Paragraph 4..."]
        }
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
        return {
            category: result.category?.toUpperCase() || 'NATIONAL',
            headline: result.headline?.toUpperCase() || 'BREAKING UPDATE',
            subHeadline: result.subHeadline || '',
            facebookDescription: result.facebookDescription || result.subHeadline || '',
            slides: Array.isArray(result.slides) ? result.slides : [result.subHeadline || 'Developing situation...'],
        };
    } catch (error) {
        console.error('Script generation failed:', error);
        return {
            category: 'NATIONAL',
            headline: 'BREAKING NEWS ALERT',
            subHeadline: 'Major developing story in the United States this hour.',
            facebookDescription: 'Major news is breaking right now across the country. Authorities are working around the clock to manage the situation.\n\nStay tuned for more updates as this story develops. Follow for the latest viral news.',
            slides: [
                'Major news is breaking right now across the country.',
                'Officials have just released a critical statement on the matter.',
                'The impact is expected to be felt by millions of citizens.',
                'Authorities are working around the clock to manage the crisis.',
                'Legal experts are already debating the long-term consequences.',
                'We will continue to bring you the very latest as it happens.'
            ]
        };
    }
}
