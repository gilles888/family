/**
 * Production : le build localisé est servi sous /fr/ et /nl/.
 * `apiBasePath` vide = le backend est exposé sur la même origine (reverse proxy vers /v1).
 * Pour un backend sur un autre domaine, renseigner son URL (ex. 'https://api.example.com') et activer le CORS côté backend.
 */
export const environment = {
  production: true,
  apiBasePath: '',
  localeUrls: {
    fr: '/fr/',
    nl: '/nl/',
  } as Record<string, string>,
};
