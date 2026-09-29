// Exécute la migration 010 (table pokeeon_partie, jeu PokéEon) contre la base Clever Cloud.
// Usage : node scripts/runMigration010.js
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

const sql = fs.readFileSync(path.join(__dirname, "../database/migrations/010_pokeeon.sql"), "utf8");

conn.query(sql, (error) => {
	if (error) {
		console.error("Migration 010 échouée :", error);
		conn.end();
		process.exit(1);
	}
	console.log("Migration 010 appliquée avec succès (table pokeeon_partie).");
	conn.end();
});
