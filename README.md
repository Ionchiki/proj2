Это приложение позволяет управлять базами данных PostgreSQL и MongoDB через единый веб-интерфейс.

## Предварительные требования

- Node.js (версия 14.0.0 или выше)
- PostgreSQL (установленный и запущенный)
- MongoDB (доступ к MongoDB Atlas или локальной установке)

## Установка

1. Клонируйте репозиторий:
```bash
git clone <your-repository-url>
cd proj2
```

2. Установите зависимости:
```bash
npm install
```
3. Создайте файл `.env` в корневой директории проекта и добавьте следующие переменные:
```env
JWT_SECRET=your-secret-key
PORT=3000
```

4. Настройте подключение к базам данных:

   В файле `server.js` найдите и измените следующие настройки:

   Для PostgreSQL:
   ```javascript
   const pgPool = new Pool({
       user: 'your_postgres_user',
       password: 'your_postgres_password',
       host: 'localhost',
       port: 5432,
       database: 'your_database_name'
   });
   ```

   Для MongoDB:
   ```javascript
   const mongoUri = 'your_mongodb_connection_string';
   ```

## Запуск приложения

1. Запустите сервер:
```bash
npm start
```
