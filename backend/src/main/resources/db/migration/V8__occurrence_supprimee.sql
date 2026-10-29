-- Statut SUPPRIME : une occurrence supprimée à la main reste en base (sinon la réconciliation de l'agenda la
-- recréerait) mais n'est plus lue. Le check de la colonne statut n'a pas de nom stable (généré par la base) :
-- on remplace la colonne, puis on nomme le nouveau check.

alter table agenda_entry add column statut_tmp varchar(10) default 'PREVU' not null;
update agenda_entry set statut_tmp = statut;
alter table agenda_entry drop column statut;
alter table agenda_entry rename column statut_tmp to statut;
alter table agenda_entry alter column statut drop default;
alter table agenda_entry add constraint ck_agenda_entry_statut
    check (statut in ('PREVU', 'COMPLETE', 'ANNULE', 'DEPLACE', 'SUPPRIME'));
