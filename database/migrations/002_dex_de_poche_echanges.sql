-- Ajoute le suivi shiny à la collection (pour Dex de Poche) et une table
-- pour le carnet d'échanges internes (Échanges Pokémon).

ALTER TABLE collectionutilisateur
	ADD COLUMN estShiny TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS echange_utilisateur (
	IdUtilisateur INT NOT NULL,
	tradeId VARCHAR(100) NOT NULL,
	coche TINYINT(1) NOT NULL DEFAULT 1,
	PRIMARY KEY (IdUtilisateur, tradeId),
	FOREIGN KEY (IdUtilisateur) REFERENCES utilisateur(IdUtilisateur) ON DELETE CASCADE
);
