const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cors = require("cors");
const session = require("express-session");

const app = express();
const db = new sqlite3.Database("notes.db");
const JWT_SECRET = "x7k9mPqWvT2jL5hY8nR3tG6zB4cF0aE2dI";

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(
  session({
    secret: "x9k2mPqWvT5jL8hY1nR4tG7zB0cF3aE6dI",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category_id INTEGER,
        isImportant INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        reminder_date TEXT, -- Dodano pole reminder_date
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(category_id) REFERENCES categories(id)
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS note_tags (
        note_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY(note_id) REFERENCES notes(id),
        FOREIGN KEY(tag_id) REFERENCES tags(id)
    )`);
});

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "94201619412-s0hbkqoer43i14218uads35a57krvcg5.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "http://localhost:5001/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) return done(err);
        if (user) {
          return done(null, user);
        } else {
          db.run(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            [email, "google"],
            (err) => {
              if (err) return done(err);
              db.get(
                "SELECT * FROM users WHERE email = ?",
                [email],
                (err, newUser) => {
                  if (err) return done(err);
                  return done(null, newUser);
                }
              );
            }
          );
        }
      });
    }
  )
);

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Brak tokena" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Nieprawidłowy token" });
    req.user = user;
    next();
  });
}

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail i hasło są wymagane" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hashedPassword],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "E-mail już istnieje" });
      }
      res.json({ message: "Użytkownik zarejestrowany", id: this.lastID });
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user)
      return res.status(400).json({ error: "Nieprawidłowy e-mail lub hasło" });
    if (user.password === "google") {
      return res.status(400).json({ error: "Użyj logowania przez Google" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ error: "Nieprawidłowy e-mail lub hasło" });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  });
});

app.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    res.redirect(`http://localhost:3000?token=${token}`);
  }
);

app.get("/categories", authenticateToken, (req, res) => {
  console.log("Pobieranie kategorii dla user_id:", req.user.id);
  db.all(
    "SELECT * FROM categories WHERE user_id = ?",
    [req.user.id],
    (err, categories) => {
      if (err) {
        console.error("Błąd pobierania kategorii:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("Zwrócone kategorie:", categories);
      res.json(categories || []);
    }
  );
});

app.post("/categories", authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Nazwa kategorii jest wymagana" });
  }
  db.run(
    "INSERT INTO categories (user_id, name) VALUES (?, ?)",
    [req.user.id, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT * FROM categories WHERE id = ?",
        [this.lastID],
        (err, category) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(category);
        }
      );
    }
  );
});

app.get("/tags", authenticateToken, (req, res) => {
  db.all("SELECT * FROM tags WHERE user_id = ?", [req.user.id], (err, tags) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tags);
  });
});

app.post("/tags", authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Nazwa tagu jest wymagana" });
  }
  db.run(
    "INSERT INTO tags (user_id, name) VALUES (?, ?)",
    [req.user.id, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM tags WHERE id = ?", [this.lastID], (err, tag) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(tag);
      });
    }
  );
});

app.get("/notes", authenticateToken, (req, res) => {
  db.all(
    "SELECT n.*, c.name as category_name FROM notes n LEFT JOIN categories c ON n.category_id = c.id WHERE n.user_id = ? ORDER BY n.created_at DESC",
    [req.user.id],
    (err, notes) => {
      if (err) return res.status(500).json({ error: err.message });

      const promises = notes.map((note) => {
        return new Promise((resolve) => {
          db.all(
            "SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?",
            [note.id],
            (err, tags) => {
              if (err) {
                console.error("Błąd pobierania tagów dla notatki:", err);
                note.tags = [];
              } else {
                note.tags = tags;
              }
              resolve(note);
            }
          );
        });
      });

      Promise.all(promises)
        .then((updatedNotes) => {
          res.json(updatedNotes);
        })
        .catch((err) => {
          res
            .status(500)
            .json({ error: "Błąd pobierania tagów: " + err.message });
        });
    }
  );
});

app.post("/notes", authenticateToken, (req, res) => {
  const { title, content, category_id, tags, reminder_date, isImportant } =
    req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Tytuł i treść notatki są wymagane" });
  }
  db.run(
    "INSERT INTO notes (user_id, title, content, category_id, reminder_date, isImportant) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.user.id,
      title,
      content,
      category_id || null,
      reminder_date || null,
      isImportant || 0,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const noteId = this.lastID;

      // Dodajemy tagi do notatki
      if (tags && tags.length > 0) {
        const tagPromises = tags.map((tagId) => {
          return new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)",
              [noteId, tagId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(tagPromises)
          .then(() => {
            db.get(
              "SELECT * FROM notes WHERE id = ?",
              [noteId],
              (err, note) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(note);
              }
            );
          })
          .catch((err) => {
            res
              .status(500)
              .json({ error: "Błąd dodawania tagów: " + err.message });
          });
      } else {
        db.get("SELECT * FROM notes WHERE id = ?", [noteId], (err, note) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(note);
        });
      }
    }
  );
});

app.put("/notes/:id", authenticateToken, (req, res) => {
  const id = req.params.id;
  const { title, content, category_id, tags, reminder_date, isImportant } =
    req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Tytuł i treść notatki są wymagane" });
  }
  db.run(
    "UPDATE notes SET title = ?, content = ?, category_id = ?, reminder_date = ?, isImportant = ? WHERE id = ? AND user_id = ?",
    [
      title,
      content,
      category_id || null,
      reminder_date || null,
      isImportant || 0,
      id,
      req.user.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Notatka nie znaleziona" });

      db.run("DELETE FROM note_tags WHERE note_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        if (tags && tags.length > 0) {
          const tagPromises = tags.map((tagId) => {
            return new Promise((resolve, reject) => {
              db.run(
                "INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)",
                [id, tagId],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });

          Promise.all(tagPromises)
            .then(() => {
              db.get("SELECT * FROM notes WHERE id = ?", [id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
              });
            })
            .catch((err) => {
              res
                .status(500)
                .json({ error: "Błąd aktualizacji tagów: " + err.message });
            });
        } else {
          db.get("SELECT * FROM notes WHERE id = ?", [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
          });
        }
      });
    }
  );
});

app.delete("/notes/:id", authenticateToken, (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM note_tags WHERE note_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(
      "DELETE FROM notes WHERE id = ? AND user_id = ?",
      [id, req.user.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
          return res.status(404).json({ error: "Notatka nie znaleziona" });
        res.json({ message: "Notatka usunięta" });
      }
    );
  });
});

app.patch("/notes/:id/important", authenticateToken, (req, res) => {
  const id = req.params.id;
  const { isImportant } = req.body;
  if (typeof isImportant !== "number" || ![0, 1].includes(isImportant)) {
    return res.status(400).json({ error: "isImportant musi być 0 lub 1" });
  }
  db.run(
    "UPDATE notes SET isImportant = ? WHERE id = ? AND user_id = ?",
    [isImportant, id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Notatka nie znaleziona" });
      db.get("SELECT * FROM notes WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.listen(5001, () => {
  console.log("Serwer działa na porcie 5001");
});
