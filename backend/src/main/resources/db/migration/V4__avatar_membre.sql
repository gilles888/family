-- Personnage (avatar) de chaque membre : configuration JSON choisie dans l'éditeur du front
-- (pièces du catalogue front, couleurs, numéro de version du catalogue). Absente = avatar par défaut.
alter table family_member add column avatar_config varchar(4000);
