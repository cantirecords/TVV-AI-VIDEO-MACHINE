import gTTS from 'gtts';
import fs from 'fs';

export async function generateTTS(text: string, outputPath: string): Promise<{ audioPath: string, subtitles: { text: string, start: number, end: number }[], durationInFrames: number }> {
    return new Promise((resolve, reject) => {
        console.log('Generating TTS with Google TTS...');

        const gtts = new gTTS(text, 'en'); // Using gTTS for now, let's refine the saved delivery
        // Note: gTTS doesn't allow changing voices, but we can refine the audio levels later

        gtts.save(outputPath, (err: any) => {
            if (err) {
                console.error('gTTS error:', err);
                reject(err);
                return;
            }

            console.log(`Audio saved to ${outputPath}`);

            // Improved timing estimation for formal delivery
            const words = text.split(/\s+/);
            const subtitles: any[] = [];
            let currentTime = 0;
            const wordsPerSec = 2.3; // Calibrated for high-energy news anchor speed

            for (let i = 0; i < words.length; i += 3) {
                const chunkWords = words.slice(i, i + 3);
                const chunkText = chunkWords.join(' ');

                // Heuristic for pauses based on punctuation
                let pauseBuffer = 0.2;
                if (chunkText.includes('.') || chunkText.includes('!') || chunkText.includes('?')) pauseBuffer = 0.45;
                if (chunkText.includes(',')) pauseBuffer = 0.3;

                const duration = (chunkWords.length / wordsPerSec) + (chunkText.length * 0.015);

                subtitles.push({
                    text: chunkText,
                    start: currentTime,
                    end: currentTime + duration + pauseBuffer
                });
                currentTime += duration + pauseBuffer;
            }

            resolve({
                audioPath: outputPath,
                subtitles,
                durationInFrames: Math.ceil((currentTime + 1) * 30) // +1s buffer
            });
        });
    });
}
