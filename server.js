const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// THIS IS THE NEW LINE: It tells the server to display your HTML, CSS, and JS files
app.use(express.static(__dirname));

app.post('/api/analyze', async (req, res) => {
    const { resumeText } = req.body;

    if (!resumeText) {
        return res.status(400).json({ error: 'Resume text is required.' });
    }

    const prompt = `
    You are an expert technical recruiter.
    Analyze this resume text and provide:
    1. Three major strengths
    2. Three areas for improvement (be specific)
    3. Two highly recommended skills to learn based on industry trends

    Format your response clearly using markdown with bullet points and bold text. Keep it professional and concise.
    
    Resume Text:
    ${resumeText}
    `;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();

        // NEW: Better error handling to show us exactly what Google is complaining about
        if (data.candidates && data.candidates.length > 0) {
            res.json({ success: true, text: data.candidates[0].content.parts[0].text });
        } else if (data.error) {
            res.status(500).json({ error: `Google API Error: ${data.error.message}` });
        } else {
            res.status(500).json({ error: 'No suggestions generated from the model.' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with the AI server.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});