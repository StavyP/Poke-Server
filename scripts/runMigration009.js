// Exécute la migration 009 (statut "inactive" + halo activé par défaut) contre la base Clever Cloud.
// Usage : node scripts/runMigration009.js
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

const sql = fs.readFileSync(path.join(__dirname, "../database/migrations/009_shasse_pause_et_halo.sql"), "utf8");

conn.query(sql, (error) => {
	if (error) {
		console.error("Migration 009 échouée :", error);
		conn.end();
		process.exit(1);
	}
	console.log("Migration 009 appliquée avec succès (statut inactive + halo par défaut).");
	conn.end();
});
