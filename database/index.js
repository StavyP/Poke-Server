require("dotenv").config();
const mysql = require("mysql");

// Pool plutôt qu'une connexion unique : quand Clever Cloud coupait la connexion (inactivité,
// redémarrage de la base), toutes les requêtes échouaient ensuite (« Cannot enqueue Query after
// fatal error ») et chaque route renvoyait 500 jusqu'au redémarrage du serveur. Le pool remplace
// les connexions perdues ; il expose le même connection.query(sql, params, callback).
const connection = mysql.createPool({
	connectionLimit: 3,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
});

module.exports = connection;
