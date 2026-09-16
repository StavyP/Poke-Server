-- Horodatage des ajouts à la collection, nécessaire pour afficher les derniers shiny
-- obtenus (widget "Derniers Shiny" de l'accueil).
ALTER TABLE collectionutilisateur
	ADD COLUMN dateAjout DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
