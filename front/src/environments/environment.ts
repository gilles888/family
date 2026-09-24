/** Développement : l'API est appelée en relatif ("/v1/...") et redirigée vers le backend par proxy.conf.json. */
export const environment = {
  production: false,
  /** Préfixe des appels API (basePath du client généré). '' = même origine. */
  apiBasePath: '',
  /** URL de chaque langue, pour le sélecteur de langue (en dev : un serveur par langue). */
  localeUrls: {
    fr: 'http://localhost:4200/',
    nl: 'http://localhost:4201/',
  } as Record<string, string>,
};
