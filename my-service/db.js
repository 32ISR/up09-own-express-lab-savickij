const Database = require('better-sqlite3')
const db = new Database('database.db')

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

// db.exec(`
//   CREATE TABLE IF NOT EXISTS books (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     title TEXT NOT NULL,
//     author TEXT NOT NULL,
//     year INTEGER NOT NULL, 
//     genre TEXT NOT NULL,
//     description TEXT  NOT NULL,
//     createdBy INTEGER NOT NULL,
//     createdAt TEXT DEFAULT (datetime('now')),
//     FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
//   );
// `);

db.exec(`
  CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    place TEXT NOT NULL,
    lvl INTEGER NOT NULL,
    time INTEGER NOT NULL,
    description TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    awardId INTEGER,
    FOREIGN KEY (awardId) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('weapon', 'armor', 'potion')),
    cost INTEGER NOT NULL,
    description TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);



// db.exec(`
//   CREATE TABLE IF NOT EXISTS review (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     questId INTEGER NOT NULL,
//     userId INTEGER NOT NULL,
//     comment TEXT NOT NULL,
//     rating INTEGER NOT NULL check (rating between 1 and 5),
//     createdAt TEXT DEFAULT (datetime('now')),
//     FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
//     FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
//   );
// `);

module.exports = db