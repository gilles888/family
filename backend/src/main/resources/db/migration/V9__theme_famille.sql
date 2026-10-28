-- Date de naissance des membres (facultative) : sert à fêter les anniversaires dans le thème de l'application.
alter table family_member add column date_naissance date;

-- Réglage du thème de l'application pour toute la famille : une seule ligne (id = 1), créée ici.
create table family_settings (
    id bigint not null,
    theme_mode varchar(10) not null default 'AUTO',
    theme_force varchar(20),
    theme_force_membre_id bigint,
    theme_force_jusqua date,
    anniversaires_actifs boolean not null default true,
    enfants_peuvent_choisir boolean not null default false,
    modifie_par bigint,
    modifie_le timestamp,
    primary key (id),
    constraint ck_family_settings_unique check (id = 1),
    constraint ck_family_settings_mode check (theme_mode in ('AUTO', 'FORCE', 'OFF')),
    constraint ck_family_settings_theme check (theme_force is null or theme_force in
        ('HALLOWEEN', 'SAINT_NICOLAS', 'NOEL', 'CARNAVAL', 'PAQUES', 'ETE', 'RENTREE', 'PRINTEMPS', 'AUTOMNE', 'HIVER', 'ANNIVERSAIRE')),
    constraint ck_family_settings_force check (theme_mode <> 'FORCE' or theme_force is not null),
    constraint fk_family_settings_membre foreign key (theme_force_membre_id) references family_member (id) on delete set null
);

insert into family_settings (id) values (1);
