const { GoogleGenAI } = require("@google/genai");
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const model = "gemini-3-flash-preview";

const dbResume = new sqlite3.Database('resume.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to resume.db");
    }
});

// ================= JOB ROUTES =================

app.post('/jobs', (req, res) => {
    const { title, company, description } = req.body;

    dbResume.run(
        `INSERT INTO tblJobs (title, company, description) VALUES (?, ?, ?)`,
        [title, company, description],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error adding job');
            }

            res.json({ id: this.lastID, title, company, description });
        }
    );
});

app.get('/jobs', (req, res) => {
    dbResume.all(`SELECT * FROM tblJobs`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error getting jobs');
        }

        res.json(rows);
    });
});

app.delete('/jobs/:id', (req, res) => {
    const { id } = req.params;

    dbResume.run(`DELETE FROM tblJobs WHERE id = ?`, [id], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error deleting job');
        }

        res.json({ message: "Job deleted" });
    });
});

// ================= SKILL ROUTES =================

app.post('/skills', (req, res) => {
    const { name } = req.body;

    dbResume.run(
        `INSERT INTO tblSkills (name) VALUES (?)`,
        [name],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error adding skill');
            }

            res.json({ id: this.lastID, name });
        }
    );
});

app.get('/skills', (req, res) => {
    dbResume.all(`SELECT * FROM tblSkills`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error getting skills');
        }

        res.json(rows);
    });
});

// ================= USER INFO ROUTES =================

app.post('/user-info', (req, res) => {
    const { name, email, phone, location, linkedin } = req.body;

    dbResume.run(
        `INSERT INTO tblUser_info (name, email, phone, location, linkedin) VALUES (?, ?, ?, ?, ?)`,
        [name, email, phone, location, linkedin],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error adding user info');
            }

            res.json({ id: this.lastID, name, email, phone, location, linkedin });
        }
    );
});

app.get('/user-info', (req, res) => {
    dbResume.all(`SELECT * FROM tblUser_info ORDER BY id DESC LIMIT 1`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error getting user info');
        }

        res.json(rows[0] || {});
    });
});

// ================= AI ROUTE =================

app.get('/improve-description', async (req, res) => {
    const { description, apiKey } = req.query;

    if (!description) {
        return res.status(400).send('Missing description parameter');
    }

    if (!apiKey) {
        return res.status(400).send('Missing Gemini API key');
    }

    try {
        const genAIUser = new GoogleGenAI({
            apiKey: apiKey
        });

        const prompt = `
Rewrite this resume bullet point using strong action verbs and measurable impact.

Rules:
- Return ONLY one sentence
- No explanations
- No multiple options
- No bullet points
- Make it professional and concise

Text:
${description}
        `;

        const objResponse = await genAIUser.models.generateContent({
            model,
            contents: prompt
        });

        let improvedText = objResponse.text; //Saves as a obj

        improvedText = improvedText //Parses the AI text that gets sent through once the ai processess the skill
            .trim()
            .replace(/^["'\s]+|["'\s]+$/g, '')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ');

        res.json({
            original: description,
            improved: improvedText,
            date: new Date().toISOString()
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error improving description: ' + error.message);
    }
});

// ================= RESET ROUTE =================

app.post('/reset', (req, res) => {
    dbResume.serialize(() => {
        dbResume.run(`DELETE FROM tblJobs`);
        dbResume.run(`DELETE FROM tblSkills`);
        dbResume.run(`DELETE FROM tblUser_info`, (err) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error resetting app');
            }

            res.json({ message: "Reset complete" });
        });
    });
});

// ================= SERVER =================

app.listen(PORT, () => {
    console.log(`✨ Resume Builder Backend running on http://localhost:${PORT}`);
});