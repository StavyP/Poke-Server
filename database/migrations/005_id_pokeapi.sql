-- Les formes régionales partagent numeroDex avec leur espèce de base, mais leur artwork
-- PokeAPI est indexé par un ID différent (ex: Raichu d'Alola = numeroDex 26, id PokeAPI
-- 10100) — sans cette colonne, getArtworkUrl affichait le sprite de la forme de base.
ALTER TABLE pokedex
	ADD COLUMN idPokeApi INT NULL;

-- Formes de base : idPokeApi == numeroDex (backfill formes régionales via
-- scripts/backfillIdPokeApiRegional.js, qui doit interroger PokeAPI par nom).
UPDATE pokedex SET idPokeApi = numeroDex WHERE forme = 0;
