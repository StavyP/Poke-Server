const fs = require("fs");
const path = require("path");

// Render dépose les "Secret Files" à plat dans /etc/secrets (pas de sous-dossier possible
// dans leur nom), donc on les cherche là en priorité et on retombe sur ce dossier en local.
const secretsDir = "/etc/secrets";
const useSecrets = fs.existsSync(path.join(secretsDir, "jwtRS256.key"));
const keysDir = useSecrets ? secretsDir : __dirname;

module.exports = {
	key: fs.readFileSync(path.join(keysDir, "jwtRS256.key")),
	keyPub: fs.readFileSync(path.join(keysDir, "jwtRS256.key.pub")),
};
