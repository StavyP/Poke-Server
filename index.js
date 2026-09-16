require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const apiRouter = require("./routes/api");

// Le dossier d'upload n'est pas versionné (contenu utilisateur) : on le recrée au démarrage
// sinon Multer plante avec ENOENT sur un clone/déploiement tout neuf.
fs.mkdirSync(path.join(__dirname, "uploads/images"), { recursive: true });

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads/images", express.static(path.join(__dirname, "uploads/images")));

app.use("/api", apiRouter);

app.get("/", (req, res) => {
	res.send(JSON.stringify("API WORKING"));
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
	console.log(`Backend listening on port ${port}`);
});

module.exports = app;
