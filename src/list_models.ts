import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function listModels() {
    const models = await groq.models.list();
    console.log(JSON.stringify(models.data.map(m => m.id), null, 2));
}

listModels();
