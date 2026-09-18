const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'game_zone',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create a connection pool for regular application queries
const pool = mysql.createPool(dbConfig);

/**
 * Initializes the database and required tables if they don't already exist.
 */
async function initDatabase() {
  let bootstrapConnection;
  try {
    // 1. Connect without specifying the database to ensure the DB itself exists
    bootstrapConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await bootstrapConnection.end();

    // 2. Ensure the users table exists with proper types and indexes
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`full_name\` VARCHAR(100) NOT NULL,
        \`username\` VARCHAR(50) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`uq_users_username\` UNIQUE (\`username\`),
        CONSTRAINT \`uq_users_email\` UNIQUE (\`email\`),
        INDEX \`idx_users_username\` (\`username\`),
        INDEX \`idx_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const connection = await pool.getConnection();
    await connection.query(createTableQuery);
    connection.release();

    console.log(`[Database] MySQL connected and initialized successfully on database: ${dbConfig.database}`);
  } catch (error) {
    console.error('[Database] Connection Error:', error.message);
    console.error('[Database] Tip: Ensure MySQL server is running and credentials in .env are correct.');
  }
}

module.exports = {
  pool,
  initDatabase
};
