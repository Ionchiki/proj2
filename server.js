const express = require('express');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { ObjectId } = require('mongodb');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connect
const pgPool = new Pool({
    user: 'postgres',
    password: '74t5',
    host: 'localhost',
    port: 5432,
    database: 'dbmanager'
});

// MongoDB connect
const mongoUri = 'mongodb+srv://Test:74t5@cluster0.zkyhieq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
let mongoClient;

async function connectToMongo() {
    try {
        mongoClient = await MongoClient.connect(mongoUri);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}

connectToMongo();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pgPool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pgPool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PostgreSQL Routes
app.get('/api/postgres/tables', authenticateToken, async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/postgres/query', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;
        const result = await pgPool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// MongoDB Routes
app.get('/api/mongodb/collections', authenticateToken, async (req, res) => {
    try {
        const db = mongoClient.db();
        const collections = await db.listCollections().toArray();
        res.json(collections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/mongodb/query', authenticateToken, async (req, res) => {
    try {
        const { collection, operation, data } = req.body;
        const db = mongoClient.db();
        const coll = db.collection(collection);
        
        let result;
        switch (operation) {
            case 'find':
                result = await coll.find(data).toArray();
                break;
            case 'insert':
                result = await coll.insertOne(data);
                break;
            case 'update':
                result = await coll.updateOne(data.filter, { $set: data.update });
                break;
            case 'delete':
                result = await coll.deleteOne(data);
                break;
            case 'drop':
                result = await coll.drop();
                break;
            default:
                throw new Error('Invalid operation');
        }
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Specific MongoDB CRUD endpoints
app.post('/api/mongodb/:collection', authenticateToken, async (req, res) => {
    try {
        const { collection } = req.params;
        const data = req.body;
        const db = mongoClient.db();
        const result = await db.collection(collection).insertOne(data);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/mongodb/:collection', authenticateToken, async (req, res) => {
    try {
        const { collection } = req.params;
        const query = req.query;
        const db = mongoClient.db();
        const result = await db.collection(collection).find(query).toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/mongodb/:collection/:id', authenticateToken, async (req, res) => {
    try {
        const { collection, id } = req.params;
        const db = mongoClient.db();
        const result = await db.collection(collection).findOne({ _id: new ObjectId(id) });
        if (!result) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/mongodb/:collection/:id', authenticateToken, async (req, res) => {
    try {
        const { collection, id } = req.params;
        const updates = req.body;
        const db = mongoClient.db();
        const result = await db.collection(collection).updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/mongodb/:collection/:id', authenticateToken, async (req, res) => {
    try {
        const { collection, id } = req.params;
        const db = mongoClient.db();
        const result = await db.collection(collection).deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 