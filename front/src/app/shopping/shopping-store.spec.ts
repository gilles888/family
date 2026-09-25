import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShoppingItemDTO, provideApi } from '../api-client';
import { ShoppingStore } from './shopping-store';

describe('ShoppingStore — cocher un article', () => {
  let store: ShoppingStore;
  let backend: HttpTestingController;
  const lait: ShoppingItemDTO = { id: 1, nom: 'Lait', achete: false, aLaMaison: false };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApi('')] });
    store = TestBed.inject(ShoppingStore);
    backend = TestBed.inject(HttpTestingController);
    TestBed.tick();
    backend.expectOne('/v1/courses').flush({ articles: [lait] });
    await TestBed.inject(ApplicationRef).whenStable();
  });

  const achete = () => store.items()[0].achete;
  const patches = () => backend.match((r) => r.method === 'PATCH' && r.url === '/v1/courses/articles/1');

  it('deux taps rapides : coché puis décoché, chacun envoyé au serveur', () => {
    store.toggleBought(1);
    store.toggleBought(1);

    expect(achete()).toBe(false);
    expect(patches().map((r) => r.request.body)).toEqual([{ achete: true }, { achete: false }]);
  });

  it('une réponse lente ne défait pas un tap plus récent', () => {
    store.toggleBought(1);
    store.toggleBought(1);
    const [first, second] = patches();

    second.flush({ ...lait, achete: false });
    first.flush({ ...lait, achete: true }); // arrive en dernier, mais correspond au premier tap

    expect(achete()).toBe(false);
  });

  it('coché tout de suite, sans attendre la réponse', () => {
    store.toggleBought(1);

    expect(achete()).toBe(true);
    patches()[0].flush({ ...lait, achete: true });
    expect(achete()).toBe(true);
  });
});
