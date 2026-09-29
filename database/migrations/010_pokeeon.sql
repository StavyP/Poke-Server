-- PokéEon (jeu idle de PokeCollect) : une partie par compte, enregistrée en JSON.
-- `version` sert au verrou optimiste : une sauvegarde faite avec une version périmée (partie
-- ouverte dans un autre onglet ou sur un autre appareil) est refusée.
-- `horodatage` (ms depuis 1970) est posé par le serveur avec Date.now() à chaque sauvegarde :
-- le client en déduit la durée d'absence avec l'horloge du serveur, sans dépendre des fuseaux
-- horaires des DATETIME ni de l'horloge de l'appareil.
CREATE TABLE IF NOT EXISTS pokeeon_partie (
	IdUtilisateur INT PRIMARY KEY,
	etat MEDIUMTEXT NOT NULL,
	version INT NOT NULL DEFAULT 1,
	horodatage BIGINT NOT NULL,
	dateCreation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (IdUtilisateur) REFERENCES utilisateur(IdUtilisateur) ON DELETE CASCADE
);
