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
}

export async function generateScript(content: string): Promise<VideoScript> {
    const prompt = `
        You are a top-tier viral news editor for social media. 
        Transform the following news into a 30-45 second "STORY SLIDESHOW".
        The video has NO voiceover, so the text must be the star.

        OUTPUT REQUIREMENTS:
        1. "headline": An attention-grabbing 3-5 word headline (e.g., "BORDER CRISIS ESCALATES").
        2. "subHeadline": A descriptive "leadin" summary (approx 15 words) in white text.
        3. "slides": An array of 4-5 descriptive paragraphs. 
           - Each paragraph should be 25-35 words.
           - Use "Journalistic" and "Dramatic" language.
           - Provide depth and context that a reader can really sink into.
        4. "category": A specific one-word category (e.g., IMMIGRATION, BORDER, JUSTICE).

        News Content:
        ${content}

        Return a JSON object:
        {
          "category": "ONE WORD",
          "headline": "VIRAL MAIN HEADLINE",
          "subHeadline": "The leadin summary here...",
          "slides": ["Detailed Paragraph 1...", "Detailed Paragraph 2...", "Detailed Paragraph 3...", "Detailed Paragraph 4..."]
        }
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(chatCompletion.choices[0].message.content || '{}');
        return {
            category: result.category?.toUpperCase() || 'NATIONAL',
            headline: result.headline?.toUpperCase() || 'BREAKING UPDATE',
            subHeadline: result.subHeadline || '',
            slides: Array.isArray(result.slides) ? result.slides : [result.subHeadline || 'Developing situation...'],
        };
    } catch (error) {
        console.error('Script generation failed:', error);
        return {
            category: 'NATIONAL',
            headline: 'BREAKING NEWS ALERT',
            subHeadline: 'Major developing story in the United States this hour.',
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
