const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// הגדרת המפתח של Gemini (יוגדר כמשתנה סביבה ב-Render)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.all('/chat', async (req, res) => {
    // קבלת הטקסט מהמתקשר (בימות המשיח זה מגיע בדרך כלל בפרמטר שאתה מגדיר)
    const userText = req.query.text || req.body.text || "שלום";

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "ענה בקצרה ובתמציתיות, ללא סימנים מיוחדים, התשובה תוקרא בטלפון."
        });

        const result = await model.generateContent(userText);
        const responseText = result.response.text();

        // החזרת תשובה בפורמט של ימות המשיח - הקראת טקסט
        // הקוד אומר למערכת: "הקרא (read) את הטקסט (t) הבא"
        res.send(`read=t-${responseText.replace(/[^א-ת0-9?. ,]/g, '')}`);

    } catch (error) {
        console.error("Error:", error);
        res.send("read=t-מצטער, חלה שגיאה בעיבוד הנתונים.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
