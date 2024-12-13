const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const SECRET_KEY = 'your_secret_key';

// Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'voting_app',
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to database');
});

// Routes

app.post('/vote', (req, res) => {
  const { category, candidate } = req.body;

  db.query(
    'INSERT INTO votes (category, candidate) VALUES (?, ?)',
    [category, candidate],
    err => {
      if (err) return res.status(500).send('Error saving vote');
      res.status(200).send('Vote saved');
    }
  );
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM teachers WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) return res.status(401).send('Invalid login');

    bcrypt.compare(password, results[0].password, (err, success) => {
      if (!success) return res.status(401).send('Invalid login');

      const token = jwt.sign({ id: results[0].id }, SECRET_KEY);
      res.json({ token });
    });
  });
});

app.get('/results', (req, res) => {
  const token = req.headers.authorization;
  jwt.verify(token, SECRET_KEY, err => {
    if (err) return res.status(401).send('Unauthorized');

    db.query(
      'SELECT category, candidate, COUNT(*) AS votes FROM votes GROUP BY category, candidate',
      (err, results) => {
        if (err) return res.status(500).send('Error fetching results');

        const data = results.reduce((acc, row) => {
          acc[row.category] = acc[row.category] || {};
          acc[row.category][row.candidate] = row.votes;
          return acc;
        }, {});

        res.json(data);
      }
    );
  });
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
