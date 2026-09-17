-- Permet de choisir un sprite précis parmi tous ceux renvoyés par PokeAPI (artwork, sprites
-- en jeu par génération, versions animées...) plutôt que juste "artwork officiel" / "sprite en
-- jeu" — spriteUrl, quand renseigné, prime sur spriteStyle côté front.
ALTER TABLE shasse
	ADD COLUMN spriteUrl VARCHAR(500) NULL;
