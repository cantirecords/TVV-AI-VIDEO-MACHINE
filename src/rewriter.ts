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

export interface NewsCardScript {
    category: string;
    headline: string;
    subHeadline: string;
    facebookDescription: string;
    styleUsed: string;
}

const EDITORIAL_STYLES = [
    { name: 'URGENT', prompt: 'Use "BREAKING", "JUST IN" language. Short, punchy, alarmist tone.' },
    { name: 'ANALYTICAL', prompt: 'Focus on the "WHY" and "CONSEQUENCES". Smart, deep, serious tone.' },
    { name: 'EMOTIONAL', prompt: 'Focus on the human impact. Use words like "TRAGEDY", "HOPE", "SHOCK".' },
    { name: 'QUESTION', prompt: 'Start with a provocative question. "ARE WE SAFE?" "WHAT COMES NEXT?"' },
    { name: 'INSIDER', prompt: 'Use phrases like "SOURCES SAY", "BEHIND CLOSED DOORS". Confidential tone.' },
    { name: 'MINIMALIST', prompt: 'Extremely direct. Subject + Verb. No fluff. Maximum impact.' }
];

export async function generateNewsCard(content: string): Promise<NewsCardScript> {
    // Rotate brain style based on random selection to keep content fresh
    const selectedStyle = EDITORIAL_STYLES[Math.floor(Math.random() * EDITORIAL_STYLES.length)]!;

    const prompt = `
        You are a high-end social media editor creating a static "NEWS CARD" graphic.
        
        CURRENT EDITORIAL STYLE: "${selectedStyle.name}"
        STYLE INSTRUCTION: ${selectedStyle.prompt}

        OUTPUT REQUIREMENTS (STRICT CONSTRAINTS):
        1. "category": A single uppercase tag (e.g., "BORDER", "ECONOMY", "CRIME").
        2. "headline": EXACTLY 6 to 8 words. MUST be specific to the news content. (e.g., "CHICAGO BEARS BALLOT MEASURE GAINS TRACTION" instead of generic topics).
        3. "subHeadline": EXACTLY 12 to 15 words. Be factual and direct. NO clickbait questions.
        4. "facebookDescription": A viral caption for the post. 2 Paragraphs.
           - Para 1: Hook the reader with a specific detail from the story.
           - Para 2: Call to action or expert insight.
        
        STRICT POLICY: If the content is vague, focus on the most important concrete fact. NEVER hallucinate war or crisis if not explicitly in the text.
        
        News Content:
        ${content}

        Return a JSON object:
        {
          "category": "TAG",
          "headline": "SIX TO EIGHT WORD HEADLINE HERE NOW",
          "subHeadline": "Twelve to fifteen words explaining exactly what happened in this specific news story.",
          "facebookDescription": "Paragraph 1...\n\nParagraph 2...",
          "styleUsed": "${selectedStyle.name}"
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
            category: result.category?.toUpperCase() || 'NEWS',
            headline: result.headline?.toUpperCase() || 'BREAKING NEWS UPDATE TODAY',
            subHeadline: result.subHeadline || 'Details are coming in regarding this major developing story.',
            facebookDescription: result.facebookDescription || '',
            styleUsed: selectedStyle.name
        };
    } catch (error) {
        console.error('News Card generation failed:', error);
        return {
            category: 'NEWS',
            headline: 'MAJOR BREAKING NEWS UPDATE',
            subHeadline: 'Developing story as authorities release new information to the public.',
            facebookDescription: 'Breaking news just in. We will keep you updated.',
            styleUsed: 'FALLBACK'
        };
    }
}
