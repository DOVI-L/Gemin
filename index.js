const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();

// הגדרת Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatHistories = {}; 

app.all('/chat', async (req, res) => {
    // בדיקה מאיפה מגיע המידע (Query או Body)
    const audioUrl = req.query.FileUrl || req.body.FileUrl;
    const phone = req.query.ApiPhone || "unknown";

    console.log(`Incoming request from: ${phone}, URL: ${audioUrl}`);

    // אם פנית מהדפדפן בלי פרמטרים - השרת לא יקרוס
    if (!audioUrl || audioUrl === 'test') {
        return res.send("read=t-השרת פעיל ומחכה להקלטה מימות המשיח.");
    }

    try {
        // הורדת הקובץ
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBase64 = Buffer.from(audioResponse.data).toString('base64');

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        if (!chatHistories[phone]) chatHistories[phone] = [];

        const chatSession = model.startChat({ history: chatHistories[phone] });

        const result = await chatSession.sendMessage([
            { inlineData: { mimeType: "audio/wav", data: audioBase64 } },
            { text: "ענה בעברית קצרה מאוד." }
        ]);

        const responseText = result.response.text().replace(/[*#_]/g, "").trim();
        
        // עדכון היסטוריה (רק אם התשובה הצליחה)
        chatHistories[phone].push({ role: "user", parts: [{ text: "שאלה קולית" }] });
        chatHistories[phone].push({ role: "model", parts: [{ text: responseText }] });

        res.send(`read=t-${responseText}`);

    } catch (error) {
        console.error("Error details:", error.message);
        res.send("read=t-חלה שגיאה בעיבוד השמע.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is LIVE on port ${PORT}`));
