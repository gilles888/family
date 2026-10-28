import { TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { FamilyMemberDTO } from '../api-client';
import { ActiveTheme } from '../theme/active-theme';
import { Avatar } from './avatar';
import { ARTICLE_FIELDS, findArticle } from './article-info';
import { OUTFIT_IDEAS, applyIdea, ideaArticles, ideaTitle } from './avatar-ideas';
import { defaultAvatar } from './avatar-config';

describe('idées de tenues', () => {
  it('chaque thème a trois idées, faites de pièces qui existent', () => {
    for (const [theme, ideas] of Object.entries(OUTFIT_IDEAS)) {
      expect(ideas, theme).toHaveLength(3);
      for (const idea of ideas!) {
        for (const field of ARTICLE_FIELDS) {
          const id = (idea as Record<string, string | undefined>)[field];
          if (id) {
            expect(findArticle(id), `${theme} : ${id}`).toBeDefined();
          }
        }
        expect(ideaTitle(idea)).not.toBe('');
      }
    }
  });

  it('appliquer une idée remet à zéro déguisement, dos, visage, objet, chapeau et accessoire', () => {
    const avant = { ...defaultAvatar(1), hat: 'hat-crown', accessory: 'acc-glasses', held: 'held-flower', face: 'face-freckles', costume: 'costume-pyjama' };
    const apres = applyIdea(avant, { costume: 'costume-witch', held: 'held-broom' });
    expect(apres).toMatchObject({ costume: 'costume-witch', held: 'held-broom', hat: 'none', accessory: 'none', face: 'none', back: 'none' });
    expect(apres.skin).toBe(avant.skin);
  });

  it('les articles d’une idée sont ceux du catalogue (pas les couleurs)', () => {
    expect(ideaArticles({ costume: 'costume-witch', held: 'held-broom', background: '#ffffff' as never })).toEqual(['costume-witch', 'held-broom']);
  });
});

describe('tenue du thème sur le personnage', () => {
  let ref: ComponentRef<Avatar>;
  const rendu = () => (ref.location.nativeElement as HTMLElement).querySelector('g[data-layer="body"]')?.getAttribute('data-part');
  const membre = (over: Partial<FamilyMemberDTO> = {}): FamilyMemberDTO => ({
    id: 7,
    nom: 'Tom',
    couleur: '#4CAF50',
    avatarConfig: { version: 2, outfit: 'outfit-hoodie' },
    tenueAuto: true,
    tenues: { HALLOWEEN: { version: 2, costume: 'costume-skeleton' } },
    ...over,
  });

  function afficher(m: FamilyMemberDTO) {
    ref = TestBed.createComponent(Avatar).componentRef;
    ref.setInput('member', m);
    ref.changeDetectorRef.detectChanges();
  }

  it('thème sans tenue enregistrée, ou thème neutre : la tenue normale', () => {
    afficher(membre());
    expect(rendu()).toBe('outfit-hoodie');
    TestBed.inject(ActiveTheme).id.set('noel');
    ref.changeDetectorRef.detectChanges();
    expect(rendu()).toBe('outfit-hoodie');
  });

  it('pendant le thème : la tenue enregistrée, partout où le personnage s’affiche', () => {
    TestBed.inject(ActiveTheme).id.set('halloween');
    afficher(membre());
    expect(rendu()).toBe('costume-skeleton');
  });

  it('« porter automatiquement » désactivé : la tenue normale', () => {
    TestBed.inject(ActiveTheme).id.set('halloween');
    afficher(membre({ tenueAuto: false }));
    expect(rendu()).toBe('outfit-hoodie');
  });

  it('une config explicite (éditeur) passe avant la tenue de thème', () => {
    TestBed.inject(ActiveTheme).id.set('halloween');
    ref = TestBed.createComponent(Avatar).componentRef;
    ref.setInput('member', membre());
    ref.setInput('config', { ...defaultAvatar(1), outfit: 'outfit-shirt' });
    ref.changeDetectorRef.detectChanges();
    expect(rendu()).toBe('outfit-shirt');
  });
});
