const express = require("express")
const db = require("./db")
const bcr = require("bcryptjs")
const jwt = require("jsonwebtoken")
const app = express()

app.use(express.json())

const PORT = 3000
const SECRET = ('159357')


const auth = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) return res.status(401).json({ error: "Failed to provide token" })

    const token = authHeader.split(" ")[1]
    if (!token) return res.status(401).json({ error: "Token has invalid form" })

    try {
        const decoded = jwt.verify(token, SECRET)
        req.user = decoded
        next()
    } catch (error) {
        console.error(error)
        return res.status(403).json({ error: "Invalid token" })
    }
}

app.post("/api/auth/signup", (req, res) => {
    console.log(req.body);

    try {
        const { username, password, email, role } = req.body

        if (!username  || !role || !password) {
            return res.status(400).json({ error: "." })
        }

        if (username.length < 3) {
            return res.status(400).json({ error: "Недостаточно символов в пароле" })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Недостаточно символов в пароле" })
        }

        const existing = db.prepare(
            "SELECT id FROM users WHERE username = ?"
        ).get(username)

        if (existing) return res.status(409).json({ error: "Пользователь уже существует" })

        const salt = bcr.genSaltSync(10)
        const hash = bcr.hashSync(password, salt)

        const info = db.prepare(`INSERT INTO users (username, email, password, role)
            VALUES(?,?,?,?)`).run(username.trim(), email.trim(), hash, role)

        const newUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid)

        const { password: _, ...safeUser } = newUser

        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(201).json({ success: true, token, user: safeUser })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to create" })
    }
})

app.post("/api/auth/signin", (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: "Missing data" })
        }

        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username)
        if (!user) return res.status(401).json({ error: "Неправильный пароль" })

        const valid = bcr.compareSync(password, user.password)
        if (!valid) return res.status(401).json({ error: "Неправильный пароль" })

        const { password: _, ...safeUser } = user
        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(200).json({ success: true, token, user: safeUser })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something wrong" })
    }
})

app.get("/api/auth/profile", auth, (req, res) => {
    try {
        const profile = db.prepare(
            "SELECT * FROM users WHERE id = ?"
        ).get(req.user.id)
        const { password, ...safeUser } = profile
        return res.status(200).json(safeUser)
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Failed to fetch" })
    }
})

app.post("/api/quests", auth, (req, res) => {
    try {
        //awardId - проверка ненужна
        const { title, place, lvl, time, awardId, description } = req.body

        if (!title || !title.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно название" })
        }

        if (!place || !place.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно место " })
        }

        if (!lvl || lvl <= 0) {
            return res
                .status(400)
                .json({ error: "Нужен уровень" })
        }
        if (!time || time<= 0) {
            return res
                .status(400)
                .json({ error: "Нужно время прохождения" })
        }

         if (!description || !description.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно описание" })
        }

        const info = db.prepare(`
            INSERT INTO quests  (title, place, lvl, time, awardId, description, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(title.trim(), place.trim(), lvl, time, awardId , description.trim(), req.user.id
        )

        const newQuest = db
            .prepare("SELECT * FROM quests WHERE id = ?")
            .get(info.lastInsertRowid)

        return res.status(201).json(newQuest)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to create" })
    }
})

app.get("/api/quests", (req, res) => {
    try {
        const quest = db.prepare(
            "SELECT * FROM quests"
        ).all()

        return res.status(200).json(quest)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to fetch" })
    }
})

app.post("/api/items", auth, (req, res) => {
    try {
        const {  title, type, cost, description  } = req.body

        if (!title || !title.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно название" })
        }

        if (!type || !type.trim()) {
            return res
                .status(400)
                .json({ error: "Нужен тип" })
        }

        if (!cost || !cost.trim()) {
            return res
                .status(400)
                .json({ error: "Нужна цена" })
        }

        if (!description || !description.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно описание" })
        }

        const info = db.prepare(`
            INSERT INTO items (createdBy, title, type, cost, description )
            VALUES (?, ?, ?, ? ,?)
            `).run(req.user.id, title.trim(), type.trim(), cost.trim(), description.trim())

        const newItems = db
            .prepare("SELECT * FROM items WHERE id = ?")
            .get(info.lastInsertRowid)
        return res.status(201).json(newItems)

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Failed to create" })
    }
})

app.delete("/api/quests/", auth, (req, res) => {
    try {
        const { id } = req.params
        const quests = db.prepare("SELECT * FROM quests WHERE id = ?").get(id)
        if (!quests) return res.status(404).json({ error: "Квест не найден" })

    db.prepare('DELETE FROM quests WHERE id = ?').run(id)
    return res.status(200).json({ message: 'Deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})

app.delete("/api/books/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id)
        if (!book) return res.status(404).json({ error: "Книга не найдена" })

        if (book.userId !== req.user.id || req.user.role !== "admin") return res.status(200).json({ message: '' })
    db.prepare('DELETE FROM books WHERE id = ?').run(id)
    return res.status(200).json({ message: 'Deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})

app.get("/api/quests/:id", (req, res) => {
    try {
        const { id } = req.params
        const quest = db.prepare("SELECT * FROM quests WHERE id = ?").get(id)
        if (!quest) return res.status(404).json({ error: "Квест не найдена" })
        const quest = db.prepare("SELECT * FROM quests WHERE bookId = ?").get(id)
        return res.status(200).json({ ...quests, items })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})

app.get("/api/books/:id/review", (req, res) => {
    try {
        const { id } = req.params
        const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id)
        if (!book) return res.status(404).json({ error: "Книга не найдена" })
        const review = db.prepare("SELECT * FROM review WHERE bookId = ?").all(id)
        return res.status(200).json(review)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})

app.get("/api/admin/users", auth, (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ error: "u aren't admin" })
        const user = db.prepare("SELECT * FROM users").all()
        return res.status(200).json(user)
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Something went wrong" })
    }
})

app.delete("/api/admin/users/:id", auth, (req, res) => {
    try {

        if (req.user.role !== "admin")
            return res.status(403).json({ error: "u aren't admin" })
        const { id } = req.params
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id)
        if (!user) return res.status(404).json({ error: "Юзер не найден" })

        db.prepare('DELETE FROM users WHERE id = ?').run(id)
        return res.status(200).json({ message: 'Deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})

app.put("/api/books/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const item = db.prepare("SELECT * FROM books WHERE id = ?").get(id)
        if (!item) {
            return res.status(404).json({ error: "Book not found" });
        }
        const newItem = { ...item, ...req.body }

        console.log(newItem);
        
        const updateStmt = db.prepare("UPDATE books SET title = ?, author = ?, year = ?, genre = ?, description = ? WHERE id = ? ")
        const result = updateStmt.run(
            newItem.title,
            newItem.author,
            newItem.year,
            newItem.genre,
            newItem.description,
            id
        );
        const newItemFromDB = db.prepare("SELECT * FROM books WHERE id = ?").get(id)

        res.status(200).json({newItemFromDB});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update book" });
    }
})

app.listen(PORT)