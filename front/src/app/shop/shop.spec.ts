import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ArticleDTO, PorteMonnaieDTO, provideApi } from '../api-client';
import { PiggyBank } from './piggy-bank';
import { ShopService } from './shop.service';

const CATALOGUE: ArticleDTO[] = [
  { id: 'hat-crown', emplacement: 'hat', prix: 0, rarete: 'commun' },
  { id: 'costume-witch', emplacement: 'costume', prix: 5, rarete: 'super', theme: 'HALLOWEEN' },
];
const wallet = (over: Partial<PorteMonnaieDTO> = {}): PorteMonnaieDTO => ({ etoilesDisponibles: 4, pieces: 2, etoilesParPiece: 10, etoilesConverties: 0, ...over });

describe('boutique', () => {
  let backend: HttpTestingController;
  let shop: ShopService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')] });
    backend = TestBed.inject(HttpTestingController);
    shop = TestBed.inject(ShopService);
  });

  function chargerMembre(id: number, w: PorteMonnaieDTO, items: { articleId: string }[] = []) {
    const membre = shop.of(id);
    membre.load().subscribe();
    backend.expectOne(`/v1/membres/${id}/porte-monnaie`).flush(w);
    backend.expectOne(`/v1/membres/${id}/articles`).flush(items);
    backend.expectOne('/v1/boutique/catalogue').flush(CATALOGUE);
    return membre;
  }

  it('un état par membre, partagé', () => {
    expect(shop.of(3)).toBe(shop.of(3));
    expect(shop.of(3)).not.toBe(shop.of(4));
  });

  it('possède les articles gratuits d’office, les payants seulement après achat', () => {
    const membre = chargerMembre(3, wallet());
    expect(membre.owns('hat-crown')).toBe(true);
    expect(membre.owns('costume-witch')).toBe(false);
    expect(membre.owns('article-inconnu')).toBe(true);
    expect(shop.price('costume-witch')).toBe(5);

    membre.buy('costume-witch').subscribe();
    backend.expectOne({ method: 'POST', url: '/v1/membres/3/boutique/achats' }).flush(wallet({ pieces: 0 }));
    expect(membre.owns('costume-witch')).toBe(true);
    expect(membre.pieces()).toBe(0);
  });

  it('articles déjà possédés au chargement', () => {
    const membre = chargerMembre(3, wallet(), [{ articleId: 'costume-witch' }]);
    expect(membre.owns('costume-witch')).toBe(true);
  });

  it('échange : le porte-monnaie est mis à jour', () => {
    const membre = chargerMembre(3, wallet({ etoilesDisponibles: 25 }));
    expect(membre.exchangeable()).toBe(2);
    membre.exchange(2).subscribe();
    const req = backend.expectOne({ method: 'POST', url: '/v1/membres/3/porte-monnaie/echange' });
    expect(req.request.body).toEqual({ pieces: 2 });
    req.flush(wallet({ etoilesDisponibles: 5, pieces: 4 }));
    expect(membre.stars()).toBe(5);
    expect(membre.pieces()).toBe(4);
  });

  describe('tirelire', () => {
    function render(w: PorteMonnaieDTO) {
      const fixture = TestBed.createComponent(PiggyBank);
      fixture.componentRef.setInput('memberId', 3);
      fixture.detectChanges();
      backend.expectOne('/v1/membres/3/porte-monnaie').flush(w);
      backend.expectOne('/v1/membres/3/articles').flush([]);
      backend.expectOne('/v1/boutique/catalogue').flush(CATALOGUE);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('assez d’étoiles : bouton d’échange avec le taux', () => {
      const el = render(wallet({ etoilesDisponibles: 23 }));
      expect(el.querySelector('button.exchange')?.textContent).toContain('10 ⭐ → 1 🪙');
      expect(el.textContent).toContain('23');
    });

    it('pas assez : encore N étoiles et barre de progression', () => {
      const el = render(wallet({ etoilesDisponibles: 7 }));
      expect(el.querySelector('button.exchange')).toBeNull();
      expect(el.querySelector('.remaining')?.textContent).toContain('Encore 3 ⭐');
      expect(el.querySelector('mat-progress-bar')).not.toBeNull();
    });
  });
});
