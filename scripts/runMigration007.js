// Exécute la migration 007 (colonne shasse.spriteUrl) contre la base Clever Cloud.
// Usage : node scripts/runMigration007.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql");

const conn = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	multipleStatements: true,
});

const sql = fs.readFileSync(path.join(__dirname, "../database/migrations/007_shasse_sprite_url.sql"), "utf8");

conn.query(sql, (error) => {
	if (error) {
		console.error("Migration 007 échouée :", error);
		conn.end();
		process.exit(1);
	}
	console.log("Migration 007 appliquée avec succès (colonne shasse.spriteUrl ajoutée).");
	conn.end();
});
