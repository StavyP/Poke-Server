-- Ajoute un statut "en pause" (l'utilisateur peut désactiver une shasse sans la marquer comme
-- trouvée ni la supprimer) et active le halo lumineux par défaut sur les nouvelles shasses.
ALTER TABLE shasse
	MODIFY COLUMN statut ENUM('active', 'inactive', 'trouve') NOT NULL DEFAULT 'active';

ALTER TABLE shasse
	MODIFY COLUMN haloActif TINYINT(1) NOT NULL DEFAULT 1;

-- Rattrape les shasses déjà créées avant ce changement de valeur par défaut.
UPDATE shasse SET haloActif = 1 WHERE haloActif = 0;
