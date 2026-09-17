-- Table des chasses aux shiny en cours ("Shasses") : compteurs de rencontres avec
-- configuration avancée (méthode, thème, raccourci clavier, auto-comptage, webhook Discord...).
-- statut passe à 'trouve' quand la capture est validée (sert d'archive/historique, pas de
-- suppression) ; configuree passe à 1 dès le premier enregistrement des paramètres avancés
-- (pilote l'état vide de la carte côté front tant que la shasse n'a pas été configurée).
CREATE TABLE IF NOT EXISTS shasse (
	idShasse INT AUTO_INCREMENT PRIMARY KEY,
	IdUtilisateur INT NOT NULL,
	idPokedex INT NOT NULL,
	statut ENUM('active', 'trouve') NOT NULL DEFAULT 'active',
	configuree TINYINT(1) NOT NULL DEFAULT 0,

	-- Paramètres de la shasse
	methode VARCHAR(50) NOT NULL DEFAULT 'Full Odds',
	jeu VARCHAR(10) NULL,
	lieu VARCHAR(150) NULL,
	charmeChroma TINYINT(1) NOT NULL DEFAULT 0,
	secrete TINYINT(1) NOT NULL DEFAULT 0,
	webhookUrl VARCHAR(255) NULL,
	webhookMessage VARCHAR(500) NULL,

	-- Paramètres du compteur
	spriteStyle VARCHAR(20) NOT NULL DEFAULT 'artwork',
	couleurTheme VARCHAR(20) NULL,
	pasIncrement INT NOT NULL DEFAULT 1,
	raccourciClavier VARCHAR(10) NULL,
	autoCompteActif TINYINT(1) NOT NULL DEFAULT 0,
	autoCompteIntervalle INT NOT NULL DEFAULT 5,
	afficherTempsPasse TINYINT(1) NOT NULL DEFAULT 1,
	haloActif TINYINT(1) NOT NULL DEFAULT 0,

	-- État
	rencontres INT NOT NULL DEFAULT 0,
	phases INT NOT NULL DEFAULT 0,
	dateDebut DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	dateCapture DATETIME NULL,
	dateMaj DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

	FOREIGN KEY (IdUtilisateur) REFERENCES utilisateur(IdUtilisateur) ON DELETE CASCADE,
	FOREIGN KEY (idPokedex) REFERENCES pokedex(idPokedex)
);
