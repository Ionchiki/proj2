// DOM Elements
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const authForm = document.getElementById('auth-form');
const toggleAuth = document.getElementById('toggle-auth');
const postgresBtn = document.getElementById('postgres-btn');
const mongodbBtn = document.getElementById('mongodb-btn');
const logoutBtn = document.getElementById('logout-btn');
const structureContent = document.getElementById('structure-content');
const queryInput = document.getElementById('query-input');
const executeBtn = document.getElementById('execute-btn');
const queryResults = document.getElementById('query-results');

// State
let isLogin = true;
let currentDB = 'postgres';
let token = localStorage.getItem('token');

// Check Authentication
if (token) {
    showMainContainer();
} else {
    showAuthContainer();
}

// Event Listeners
authForm.addEventListener('submit', handleAuth);
toggleAuth.addEventListener('click', toggleAuthMode);
postgresBtn.addEventListener('click', () => switchDatabase('postgres'));
mongodbBtn.addEventListener('click', () => switchDatabase('mongodb'));
logoutBtn.addEventListener('click', handleLogout);
executeBtn.addEventListener('click', executeQuery);

// Authentication Functions
async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const data = await response.json();
        token = data.token;
        localStorage.setItem('token', token);
        showMainContainer();
        loadDatabaseStructure();
    } catch (error) {
        alert(error.message);
    }
}

function toggleAuthMode(e) {
    e.preventDefault();
    isLogin = !isLogin;
    const title = document.querySelector('#auth-container h2');
    const toggleText = document.querySelector('#toggle-auth');
    
    title.textContent = isLogin ? 'Login' : 'Register';
    toggleText.textContent = isLogin ? 'Don\'t have an account? Register' : 'Already have an account? Login';
}

function handleLogout() {
    localStorage.removeItem('token');
    showAuthContainer();
}

// UI Functions
function showAuthContainer() {
    authContainer.classList.remove('hidden');
    mainContainer.classList.add('hidden');
}

function showMainContainer() {
    authContainer.classList.add('hidden');
    mainContainer.classList.remove('hidden');
}

// Database Functions
function switchDatabase(db) {
    currentDB = db;
    postgresBtn.classList.toggle('active', db === 'postgres');
    mongodbBtn.classList.toggle('active', db === 'mongodb');
    loadDatabaseStructure();
}

async function loadDatabaseStructure() {
    try {
        const endpoint = currentDB === 'postgres' 
            ? '/api/postgres/tables'
            : '/api/mongodb/collections';
            
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load database structure');
        }

        const data = await response.json();
        displayDatabaseStructure(data);
    } catch (error) {
        alert(error.message);
    }
}

function displayDatabaseStructure(items) {
    structureContent.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.textContent = currentDB === 'postgres' ? item.table_name : item.name;
        div.addEventListener('click', () => selectStructureItem(div));
        structureContent.appendChild(div);
    });
}

function selectStructureItem(element) {
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    
    if (currentDB === 'postgres') {
        queryInput.value = `SELECT * FROM ${element.textContent} LIMIT 10;`;
    } else {
        const query = {
            collection: element.textContent,
            operation: 'find',
            data: {}
        };
        queryInput.value = JSON.stringify(query, null, 2);
    }
}

async function executeQuery() {
    try {
        const query = queryInput.value;
        const endpoint = currentDB === 'postgres' 
            ? '/api/postgres/query'
            : '/api/mongodb/query';
            
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: currentDB === 'postgres' 
                ? JSON.stringify({ query })
                : query
        });

        if (!response.ok) {
            throw new Error('Query execution failed');
        }

        const data = await response.json();
        displayQueryResults(data);
    } catch (error) {
        alert(error.message);
    }
}

function displayQueryResults(data) {
    if (!Array.isArray(data) || data.length === 0) {
        queryResults.innerHTML = '<p>No results found</p>';
        return;
    }

    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = typeof value === 'object' ? JSON.stringify(value) : value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    queryResults.innerHTML = '';
    queryResults.appendChild(table);
} 