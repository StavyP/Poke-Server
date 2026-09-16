-- Schéma complet de la base Pokecollec, reconstruit à partir de toutes les requêtes SQL
-- du backend (BackEnd/routes/controllers/*.js). À exécuter une seule fois sur une base neuve.

CREATE TABLE IF NOT EXISTS utilisateur (
	IdUtilisateur INT AUTO_INCREMENT PRIMARY KEY,
	pseudo VARCHAR(50) NOT NULL UNIQUE,
	email VARCHAR(255) NOT NULL UNIQUE,
	motDePasse VARCHAR(255) NOT NULL,
	privilege TINYINT NOT NULL DEFAULT 1,
	date DATETIME NOT NULL,
	email_confirmed TINYINT(1) NOT NULL DEFAULT 0,
	imageProfil VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS email_tokens (
	id INT AUTO_INCREMENT PRIMARY KEY,
	token VARCHAR(255) NOT NULL,
	IdUtilisateur INT NOT NULL,
	expiration DATETIME NOT NULL,
	FOREIGN KEY (IdUtilisateur) REFERENCES utilisateur(IdUtilisateur) ON DELETE CASCADE
);

-- Une ligne par espèce (forme = 0 pour la forme standard, réservé pour les formes régionales plus tard).
CREATE TABLE IF NOT EXISTS pokedex (
	idPokedex INT AUTO_INCREMENT PRIMARY KEY,
	numeroDex INT NOT NULL,
	nomPokemon VARCHAR(100) NOT NULL,
	type1 VARCHAR(20) NOT NULL,
	type2 VARCHAR(20) NULL,
	forme TINYINT NOT NULL DEFAULT 0,
	idForme VARCHAR(50) NULL,
	UNIQUE KEY uniq_dex_forme (numeroDex, forme)
);

CREATE TABLE IF NOT EXISTS stats (
	idPokedex INT PRIMARY KEY,
	pv SMALLINT NOT NULL,
	att SMALLINT NOT NULL,
	def SMALLINT NOT NULL,
	attSpe SMALLINT NOT NULL,
	defSpe SMALLINT NOT NULL,
	vit SMALLINT NOT NULL,
	FOREIGN KEY (idPokedex) REFERENCES pokedex(idPokedex) ON DELETE CASCADE
);

-- Multiplicateur de dégâts subis par type d'attaque, stocké tel qu'affiché ("x1", "x2", "x0.5", "x0"...).
CREATE TABLE IF NOT EXISTS faiblesse (
	idPokedex INT PRIMARY KEY,
	faiblesseNormal VARCHAR(6) NOT NULL,
	faiblesseFeu VARCHAR(6) NOT NULL,
	faiblesseEau VARCHAR(6) NOT NULL,
	faiblessePlante VARCHAR(6) NOT NULL,
	faiblesseElectrik VARCHAR(6) NOT NULL,
	faiblesseGlace VARCHAR(6) NOT NULL,
	faiblesseCombat VARCHAR(6) NOT NULL,
	faiblessePoison VARCHAR(6) NOT NULL,
	faiblesseSol VARCHAR(6) NOT NULL,
	faiblesseVol VARCHAR(6) NOT NULL,
	faiblessePsy VARCHAR(6) NOT NULL,
	faiblesseInsecte VARCHAR(6) NOT NULL,
	faiblesseRoche VARCHAR(6) NOT NULL,
	faiblesseSpectre VARCHAR(6) NOT NULL,
	faiblesseTenebre VARCHAR(6) NOT NULL,
	faiblesseAcier VARCHAR(6) NOT NULL,
	faiblesseDragon VARCHAR(6) NOT NULL,
	faiblesseFee VARCHAR(6) NOT NULL,
	FOREIGN KEY (idPokedex) REFERENCES pokedex(idPokedex) ON DELETE CASCADE
);

-- Une ligne par étape de chaque chaîne d'évolution (family = id de la chaîne côté PokeAPI).
CREATE TABLE IF NOT EXISTS evolution (
	id INT AUTO_INCREMENT PRIMARY KEY,
	family INT NOT NULL,
	evolutionName VARCHAR(100) NOT NULL,
	evolutionNumber TINYINT NOT NULL,
	evolutionCondition VARCHAR(255) NULL,
	INDEX idx_family (family),
	INDEX idx_evolutionName (evolutionName)
);

CREATE TABLE IF NOT EXISTS favoris (
	IdUtilisateur INT NOT NULL,
	idPokedex INT NOT NULL,
	PRIMARY KEY (IdUtilisateur, idPokedex),
	FOREIGN KEY (IdUtilisateur) REFERENCES utilisateur(IdUtilisateur) ON DELETE CASCADE,
	FOREIGN KEY (idPokedex) REFERENCES pokedex(idPokedex) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collectionutilisateur (
	idUtilisateurCollect INT AUTO_INCREMENT PRIMARY KEY,
	surnom VARCHAR(100) NULL,
	nombreDeRencontre INT NULL,
	methode VARCHAR(100) NULL,
	jeu VARCHAR(100) NULL,
	IdUtilisateur INT NOT NULL,
	idPokedex INT NOT NULL,
	FOREIGN KEY (IdUtilisateur) REFERENCES utilisateur(IdUtilisateur) ON DELETE CASCADE,
	FOREIGN KEY (idPokedex) REFERENCES pokedex(idPokedex) ON DELETE CASCADE
);
