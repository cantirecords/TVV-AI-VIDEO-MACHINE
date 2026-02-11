import { generateTTS } from './src/tts.js';
import path from 'path';
import fs from 'fs';

async function test() {
    const outputPath = path.join(process.cwd(), 'test-audio.mp3');
    console.log('Testing TTS generation...');
    try {
        const data = await generateTTS('Hello, this is a test of the automated news video machine.', outputPath);
        console.log('Success!', data);
        console.log('File size:', fs.statSync(outputPath).size);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
