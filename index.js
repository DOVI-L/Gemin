const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// אובייקט לשמירת היסטוריית השיחות בזיכרון השרת
const chatHistories = {};

app.all('/chat', async (req, res) => {
    // קבלת נתונים מימות המשיח
    const audioUrl = req.query.FileUrl || req.body.FileUrl;
    const phone = req.query.ApiPhone || "unknown";

    if (!audioUrl) {
        return res.send("read=t-לא התקבלה הקלטה, אנא נסה שוב.");
    }

    try {
        // הורדת קובץ השמע מהקישור של ימות המשיח
        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBase64 = Buffer.from(audioResponse.data).toString('base64');

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // ניהול היסטוריה: אם אין היסטוריה למספר הזה, צור מערך חדש
        if (!chatHistories[phone]) {
            chatHistories[phone] = [];
        }

        // יצירת צ'אט עם היסטוריה
        const chatSession = model.startChat({
            history: chatHistories[phone],
            generationConfig: { maxOutputTokens: 500 }
        });

        // שליחת השמע ל-Gemini
        const result = await chatSession.sendMessage([
            {
                inlineData: {
                    mimeType: "audio/wav",
                    data: audioBase64
                }
            },
            { text: "הקשב לשמע וענה בעברית קצרה וברורה להקראה טלפונית. שמור על רצף מהודעות קודמות אם היו." }
        ]);

        const responseText = result.response.text().replace(/[*#_]/g, "").trim();

        // שמירת התשובה בהיסטוריה המקומית (אופציונלי, sendMessage מעדכן את ה-session)
        // כדי לשמור על הזיכרון לאורך זמן ב-Render:
        chatHistories[phone].push({ role: "user", parts: [{ text: "שמע שנשלח" }] });
        chatHistories[phone].push({ role: "model", parts: [{ text: responseText }] });

        // הגבלת היסטוריה ל-10 הודעות אחרונות כדי לא להכביד על הזיכרון
        if (chatHistories[phone].length > 10) chatHistories[phone].shift();

        // שליחת התגובה בפורמט ימות המשיח
        res.send(`read=t-${responseText}&id_list_message=t-${responseText}`);

    } catch (error) {
        console.error("Error:", error);
        res.send("read=t-חלה שגיאה בעיבוד השאלה.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
