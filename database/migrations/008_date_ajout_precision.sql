-- Une capture shiny peut être enregistrée avec une date incomplète (année seule, ou mois +
-- année sans le jour) : dateAjout reste un DATETIME complet (MySQL n'a pas de type "date
-- partielle"), avec jour/mois manquants remplacés par "01" côté application. Cette colonne
-- retient ce qui a été réellement saisi, pour ne pas afficher/réafficher en édition un jour ou
-- un mois inventé comme si l'utilisateur l'avait précisé.
ALTER TABLE collectionutilisateur
	ADD COLUMN dateAjoutPrecision ENUM('jour', 'mois', 'annee') NOT NULL DEFAULT 'jour';
