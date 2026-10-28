import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Dégradés, ombres et textures partagés par les maquettes (à définir une fois dans le <defs> de chaque SVG).
 * Les ombres sont des polygones flous (feGaussianBlur) : statiques, aucun filtre n'est animé.
 */
@Component({
  selector: 'defs[labDefs]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- relief des surfaces : un reflet en haut, une ombre en bas -->
    <svg:linearGradient id="lab-v" x1="0" y1="0" x2="0" y2="1">
      <svg:stop offset="0" stop-color="#fff" stop-opacity="0.22" />
      <svg:stop offset="0.55" stop-color="#fff" stop-opacity="0" />
      <svg:stop offset="1" stop-color="#3b1d0a" stop-opacity="0.2" />
    </svg:linearGradient>
    <svg:linearGradient id="lab-h" x1="0" y1="0" x2="1" y2="0">
      <svg:stop offset="0" stop-color="#fff" stop-opacity="0.2" />
      <svg:stop offset="1" stop-color="#3b1d0a" stop-opacity="0.18" />
    </svg:linearGradient>
    <svg:linearGradient id="lab-top" x1="0" y1="1" x2="0" y2="0">
      <svg:stop offset="0" stop-color="#fff" stop-opacity="0.05" />
      <svg:stop offset="1" stop-color="#fff" stop-opacity="0.3" />
    </svg:linearGradient>
    <svg:linearGradient id="lab-wall" x1="0" y1="0" x2="0" y2="1">
      <svg:stop offset="0" stop-color="#fff" stop-opacity="0.35" />
      <svg:stop offset="1" stop-color="#8a4b2a" stop-opacity="0.16" />
    </svg:linearGradient>
    <svg:radialGradient id="lab-vignette" cx="0.5" cy="0.45" r="0.8">
      <svg:stop offset="0.55" stop-color="#5a2a14" stop-opacity="0" />
      <svg:stop offset="1" stop-color="#5a2a14" stop-opacity="0.32" />
    </svg:radialGradient>
    <svg:linearGradient id="lab-sky" x1="0" y1="0" x2="0" y2="1">
      <svg:stop offset="0" stop-color="#7fc4f5" />
      <svg:stop offset="1" stop-color="#d9f1ff" />
    </svg:linearGradient>
    <svg:linearGradient id="lab-glass" x1="0" y1="0" x2="1" y2="1">
      <svg:stop offset="0" stop-color="#ffffff" stop-opacity="0.65" />
      <svg:stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    </svg:linearGradient>
    <!-- corps du personnage : ombre sur le côté droit, reflet sur le gauche -->
    <svg:linearGradient id="fig-shade" x1="0" y1="0" x2="1" y2="0">
      <svg:stop offset="0" stop-color="#fff" stop-opacity="0.18" />
      <svg:stop offset="0.45" stop-color="#000" stop-opacity="0" />
      <svg:stop offset="1" stop-color="#1a0b2e" stop-opacity="0.3" />
    </svg:linearGradient>
    <svg:linearGradient id="fig-shade-v" x1="0" y1="0" x2="0" y2="1">
      <svg:stop offset="0" stop-color="#1a0b2e" stop-opacity="0.22" />
      <svg:stop offset="0.25" stop-color="#1a0b2e" stop-opacity="0" />
    </svg:linearGradient>
    <svg:clipPath id="lab-window-clip"><svg:rect x="0" y="0" width="120" height="100" /></svg:clipPath>
    <svg:filter id="lab-blur" x="-20%" y="-20%" width="140%" height="140%"><svg:feGaussianBlur stdDeviation="7" /></svg:filter>
    <svg:filter id="lab-blur-soft" x="-30%" y="-30%" width="160%" height="160%"><svg:feGaussianBlur stdDeviation="16" /></svg:filter>
    <svg:filter id="lab-blur-s" x="-20%" y="-20%" width="140%" height="140%"><svg:feGaussianBlur stdDeviation="2.5" /></svg:filter>
  `,
})
export class LabDefs {}
