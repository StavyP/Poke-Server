const fs = require("fs");
const path = require("path");

// Render dépose les "Secret Files" à plat dans /etc/secrets (pas de sous-dossier possible
// dans leur nom), donc on les cherche là en priorité et on retombe sur ce dossier en local.
const secretsDir = "/etc/secrets";
const useSecrets = fs.existsSync(path.join(secretsDir, "jwtRS256.key"));
const keysDir = useSecrets ? secretsDir : __dirname;

// Un copier-coller dans un champ web aplatit parfois les retours à la ligne d'un fichier PEM
// (header/footer + corps base64 sur une seule ligne) : on le remet en forme si besoin plutôt
// que de planter au démarrage.
function normalizePem(content) {
	const str = content.toString().trim();
	if (str.includes("\n")) return str;
	const match = str.match(/^(-----BEGIN [^-]+-----)(.*)(-----END [^-]+-----)$/);
	if (!match) return str;
	const [, header, body, footer] = match;
	const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
	return `${header}\n${wrapped}\n${footer}\n`;
}

module.exports = {
	key: normalizePem(fs.readFileSync(path.join(keysDir, "jwtRS256.key"))),
	keyPub: normalizePem(fs.readFileSync(path.join(keysDir, "jwtRS256.key.pub"))),
};
