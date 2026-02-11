import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export type FocusPoint = 'left' | 'center' | 'right';

export async function detectSubjectFocus(imageUrl: string): Promise<FocusPoint> {
    if (!imageUrl) return 'center';

    try {
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this news image. Where is the main human subject or focal point located horizontally? Answer only with one word: 'left', 'center', or 'right'."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                            }
                        }
                    ]
                }
            ],
            max_tokens: 10,
        });

        const result = response.choices[0]?.message?.content?.toLowerCase().trim();
        console.log(`Vision analysis for focus: ${result}`);

        if (result?.includes('left')) return 'left';
        if (result?.includes('right')) return 'right';
        return 'center';
    } catch (error) {
        console.error('Vision analysis failed:', error);
        return 'center';
    }
}
