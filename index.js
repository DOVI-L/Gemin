const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios'); // תצטרך להתקין: npm install axios

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.all('/chat', async (req, res) => {
    // ימות המשיח שולחים את הנתיב להקלטה בפרמטר FileURL
    const audioUrl = req.query.FileUrl || req.body.FileUrl;

    if (!audioUrl) {
        return res.send("read=t-לא התקבלה הקלטה");
    }

    try {
        // 1. הורדת קובץ השמע מימות המשיח
        const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(response.data).toString('base64');

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 2. שליחת השמע ישירות ל-Gemini
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/wav", 
                    data: audioBuffer
                }
            },
            { text: "הקשב להקלטה וענה עליה בקצרה בעברית. אם זו שאלה - ענה עליה. אם זו בקשה - בצע אותה. ענה בטקסט נקי בלבד." },
        ]);

        const responseText = result.response.text();

        // 3. החזרת התשובה לימות המשיח
        res.send(`read=t-${responseText.replace(/[^א-ת0-9?. ,]/g, '')}`);

    } catch (error) {
        console.error("Error:", error);
        res.send("read=t-חלה שגיאה בעיבוד השמע");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
