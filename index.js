const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// האובייקט ששומר את כל השיחות הפעילות בזיכרון השרת
const chatHistories = {}; 

app.all('/chat', async (req, res) => {
    const phone = req.query.ApiPhone || "unknown";
    const audioUrl = req.query.FileUrl || req.body.FileUrl;

    // --- שלב א: הדרכה ראשונית (כשאין עדיין הקלטה) ---
    if (!audioUrl) {
        console.log(`Caller ${phone} joined. Sending recording command.`);
        // הפקודה מחזירה הוראה להקליט ושולחת חזרה לאותה כתובת
        return res.send(`read=t-נא לומר את שאלתך לאחר הצליל ולסיים בסולמית&type=record&record_ok_link=https://gemin-lz4p.onrender.com/chat&api_add_0=FileUrl=val,last_record_link&api_add_1=ApiPhone=val,api_phone&record_ok_no_confirm=yes&record_time_out=3`);
    }

    // --- שלב ב: עיבוד השמע ושמירה על רצף השיחה ---
    try {
        console.log(`Processing audio for ${phone} with history context.`);
        
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBase64 = Buffer.from(audioResponse.data).toString('base64');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // אתחול היסטוריה למספר טלפון חדש אם לא קיים
        if (!chatHistories[phone]) {
            chatHistories[phone] = [];
        }

        // יצירת שיחה שמבוססת על ההיסטוריה הקיימת בזיכרון
        const chatSession = model.startChat({
            history: chatHistories[phone]
        });

        // שליחת השמע ל-Gemini בתוך ה-Chat Session
        const result = await chatSession.sendMessage([
            {
                inlineData: {
                    mimeType: "audio/wav",
                    data: audioBase64
                }
            },
            { text: "ענה בעברית קצרה מאוד. שמור על רצף השיחה הקודם." }
        ]);

        const responseText = result.response.text().replace(/[^א-ת0-9?. ,]/g, "").trim();
        
        // עדכון ההיסטוריה בזיכרון השרת לאחר התשובה
        chatHistories[phone].push({ role: "user", parts: [{ text: "שאלה קולית" }] });
        chatHistories[phone].push({ role: "model", parts: [{ text: responseText }] });

        // הגבלת זיכרון ל-10 הודעות כדי למנוע עומס
        if (chatHistories[phone].length > 10) chatHistories[phone].shift();

        // השמעת התשובה וחזרה אוטומטית לתחילת השלוחה לשאלה הבאה (רצף שיחה בטלפון)
        res.send(`read=t-${responseText}&next=/current`);

    } catch (error) {
        console.error("Error:", error.message);
        res.send("read=t-חלה שגיאה בעיבוד השמע, אנא נסו שוב.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server LIVE with History Support`));
