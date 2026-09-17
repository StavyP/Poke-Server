-- Le tri "Génération" et le filtre "Légendaire" du Pokédex reposaient sur des colonnes
-- (idGeneration, legendaire) qui n'ont jamais existé dans le schéma reconstruit — d'où le
-- filtre qui ne renvoyait plus jamais aucun résultat. Backfill via scripts/backfillGenerationLegendaire.js.
ALTER TABLE pokedex
	ADD COLUMN idGeneration TINYINT NULL,
	ADD COLUMN legendaire TINYINT(1) NOT NULL DEFAULT 0;
