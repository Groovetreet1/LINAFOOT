import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { z, type ZodType } from 'zod';
import { authenticate, createToken, type AuthUser } from './auth.ts';
import type { AppOptions } from './config.ts';
import { openDatabase } from './database.ts';
import { AppError, errorBody } from './errors.ts';

interface MatchRow {
  id: string;
  league: string;
  leagueLogo: string;
  homeTeam: string;
  homeTeamLogo: string;
  awayTeam: string;
  awayTeamLogo: string;
  kickoff: string;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  minute: number | null;
  homeScore: number;
  awayScore: number;
  info: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
}

type MatchEventType = 'goal' | 'card' | 'sub' | 'var' | 'info';

interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: 'home' | 'away' | 'neutral';
  player?: string;
  text: string;
}

interface MatchStats {
  possessionHome: number;
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  savesHome: number;
  savesAway: number;
  passesHome: number;
  passesAway: number;
}

interface MatchDetails {
  venue: string;
  referee: string;
  stage: string;
  broadcast: string;
  weather: string;
  events: MatchEvent[];
  stats: MatchStats;
  summary: string;
}

interface LiveScript {
  key: string;
  preInfo: string;
  liveInfo: string;
  finishedInfo: string;
  venue: string;
  referee: string;
  stage: string;
  weather: string;
  baseStats: MatchStats;
  events: MatchEvent[];
  finalHome: number;
  finalAway: number;
}

const LIVE_SCRIPTS: LiveScript[] = [
  {
    key: 'Portugal|Denmark',
    preInfo: 'Quart de finale retour très attendu entre le Portugal et le Danemark.',
    liveInfo: 'Le Danemark surprend à Lisbonne et mène nettement.',
    finishedInfo: 'Terminé: victoire du Danemark 3-0 au Portugal.',
    venue: 'Estádio da Luz, Lisbonne',
    referee: 'S. Marciniak',
    stage: 'UEFA Nations League · Quart de finale',
    weather: '18°C · ciel dégagé',
    baseStats: { possessionHome: 61, possessionAway: 39, shotsHome: 14, shotsAway: 9, shotsOnTargetHome: 4, shotsOnTargetAway: 5, cornersHome: 7, cornersAway: 4, foulsHome: 10, foulsAway: 13, yellowCardsHome: 1, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 2, savesAway: 4, passesHome: 512, passesAway: 328 },
    events: [
      { minute: 12, type: 'card', team: 'away', player: 'Nørgaard', text: 'Carton jaune pour Nørgaard.' },
      { minute: 31, type: 'info', team: 'home', player: 'B. Fernandes', text: 'Occasion dangereuse repoussée par le gardien.' },
      { minute: 43, type: 'goal', team: 'away', player: 'Højbjerg', text: 'But sur penalty de Højbjerg (0-1).' },
      { minute: 49, type: 'goal', team: 'away', player: 'Højlund', text: 'But de Højlund après contre-attaque (0-2).' },
      { minute: 57, type: 'goal', team: 'away', player: 'Højlund', text: 'Deuxième but de Højlund (0-3).' },
      { minute: 66, type: 'sub', team: 'home', text: 'Changements offensifs côté Portugal.' },
      { minute: 78, type: 'info', team: 'home', text: 'Le Portugal pousse pour réduire le score.' },
    ],
    finalHome: 0, finalAway: 3,
  },
  {
    key: 'Northern Ireland|Ukraine',
    preInfo: 'Match serré attendu entre l’Irlande du Nord et l’Ukraine.',
    liveInfo: 'L’Irlande du Nord tient son avantage au Windsor Park.',
    finishedInfo: 'Terminé: Irlande du Nord 1-0 Ukraine.',
    venue: 'Windsor Park, Belfast',
    referee: 'I. Kovács',
    stage: 'UEFA Nations League · Barrage',
    weather: '11°C · pluie fine',
    baseStats: { possessionHome: 44, possessionAway: 56, shotsHome: 8, shotsAway: 11, shotsOnTargetHome: 3, shotsOnTargetAway: 3, cornersHome: 3, cornersAway: 6, foulsHome: 14, foulsAway: 11, yellowCardsHome: 2, yellowCardsAway: 1, redCardsHome: 0, redCardsAway: 0, savesHome: 3, savesAway: 2, passesHome: 287, passesAway: 401 },
    events: [
      { minute: 18, type: 'card', team: 'home', player: 'Brown', text: 'Carton jaune pour faute tactique.' },
      { minute: 39, type: 'info', team: 'away', text: 'L’Ukraine domine la possession sans cadrer.' },
      { minute: 52, type: 'sub', team: 'away', text: 'Changement offensif pour l’Ukraine.' },
      { minute: 68, type: 'goal', team: 'home', player: 'Devlin', text: 'But de Devlin ! L’Irlande du Nord mène 1-0.' },
      { minute: 74, type: 'card', team: 'away', player: 'Zinchenko', text: 'Carton jaune après contestation.' },
      { minute: 83, type: 'info', team: 'home', text: 'Bloc bas solide et contre dangereux.' },
    ],
    finalHome: 1, finalAway: 0,
  },
  {
    key: 'Austria|Republic of Ireland',
    preInfo: 'Autriche et Irlande se disputent un duel équilibré.',
    liveInfo: 'Match serré, les deux équipes se neutralisent.',
    finishedInfo: 'Terminé: Autriche 0-0 République d’Irlande.',
    venue: 'Ernst-Happel-Stadion, Vienne',
    referee: 'C. Turpin',
    stage: 'UEFA Nations League · Groupe',
    weather: '14°C · nuageux',
    baseStats: { possessionHome: 52, possessionAway: 48, shotsHome: 10, shotsAway: 9, shotsOnTargetHome: 2, shotsOnTargetAway: 2, cornersHome: 5, cornersAway: 4, foulsHome: 12, foulsAway: 15, yellowCardsHome: 1, yellowCardsAway: 3, redCardsHome: 0, redCardsAway: 0, savesHome: 2, savesAway: 2, passesHome: 356, passesAway: 331 },
    events: [
      { minute: 9, type: 'info', team: 'home', text: 'Première frappe cadrée côté autrichien.' },
      { minute: 27, type: 'card', team: 'away', player: 'Collins', text: 'Carton jaune pour Collins.' },
      { minute: 44, type: 'info', team: 'neutral', text: 'Mi-temps équilibrée, 0-0.' },
      { minute: 58, type: 'sub', team: 'home', text: 'Double changement pour relancer l’attaque.' },
      { minute: 71, type: 'card', team: 'away', player: 'O’Shea', text: 'Carton jaune, faute au milieu.' },
      { minute: 82, type: 'info', team: 'away', text: 'Grosse occasion irlandaise sur coup franc.' },
    ],
    finalHome: 0, finalAway: 0,
  },
  {
    key: 'Haiti|United States',
    preInfo: 'Quart de finale aller: Haïti reçoit les États-Unis ce soir.',
    liveInfo: 'Haïti défie les États-Unis dans un match intense.',
    finishedInfo: 'Terminé: Haïti 1-2 États-Unis.',
    venue: 'Stade Sylvio Cator, Port-au-Prince',
    referee: 'C. Ramos',
    stage: 'Concacaf Nations League · Quart de finale aller',
    weather: '29°C · humide',
    baseStats: { possessionHome: 41, possessionAway: 59, shotsHome: 9, shotsAway: 13, shotsOnTargetHome: 3, shotsOnTargetAway: 6, cornersHome: 4, cornersAway: 7, foulsHome: 16, foulsAway: 10, yellowCardsHome: 2, yellowCardsAway: 1, redCardsHome: 0, redCardsAway: 0, savesHome: 4, savesAway: 2, passesHome: 298, passesAway: 455 },
    events: [
      { minute: 22, type: 'goal', team: 'away', player: 'Pulisic', text: 'Ouverture du score américaine.' },
      { minute: 37, type: 'card', team: 'home', text: 'Carton jaune pour contestation.' },
      { minute: 55, type: 'goal', team: 'home', player: 'Pierrot', text: 'Égalisation haïtienne !' },
      { minute: 73, type: 'goal', team: 'away', player: 'McKennie', text: 'Les USA reprennent l’avantage.' },
      { minute: 81, type: 'sub', team: 'away', text: 'Changement défensif pour conserver le score.' },
    ],
    finalHome: 1, finalAway: 2,
  },
  {
    key: 'Jamaica|Mexico',
    preInfo: 'Quart de finale aller à Kingston entre Jamaïque et Mexique.',
    liveInfo: 'Le Mexique cherche à faire la différence à l’extérieur.',
    finishedInfo: 'Terminé: Jamaïque 0-1 Mexique.',
    venue: 'Independence Park, Kingston',
    referee: 'M. Escobar',
    stage: 'Concacaf Nations League · Quart de finale aller',
    weather: '27°C · soirée claire',
    baseStats: { possessionHome: 46, possessionAway: 54, shotsHome: 8, shotsAway: 12, shotsOnTargetHome: 2, shotsOnTargetAway: 4, cornersHome: 3, cornersAway: 6, foulsHome: 13, foulsAway: 11, yellowCardsHome: 2, yellowCardsAway: 1, redCardsHome: 0, redCardsAway: 0, savesHome: 3, savesAway: 2, passesHome: 312, passesAway: 377 },
    events: [
      { minute: 33, type: 'info', team: 'away', text: 'Le Mexique contrôle le tempo.' },
      { minute: 49, type: 'card', team: 'home', text: 'Carton jaune côté jamaïcain.' },
      { minute: 63, type: 'goal', team: 'away', player: 'Lozano', text: 'But mexicain sur une action rapide.' },
      { minute: 85, type: 'info', team: 'home', text: 'Dernière pression jamaïcaine.' },
    ],
    finalHome: 0, finalAway: 1,
  },
  {
    key: 'New Zealand|India',
    preInfo: 'Match amical international entre Nouvelle-Zélande et Inde.',
    liveInfo: 'La Nouvelle-Zélande domine les débats.',
    finishedInfo: 'Terminé: Nouvelle-Zélande 2-0 Inde.',
    venue: 'Go Media Stadium, Auckland',
    referee: 'A. King',
    stage: 'Match amical international',
    weather: '16°C · vent léger',
    baseStats: { possessionHome: 58, possessionAway: 42, shotsHome: 15, shotsAway: 6, shotsOnTargetHome: 6, shotsOnTargetAway: 1, cornersHome: 8, cornersAway: 2, foulsHome: 9, foulsAway: 12, yellowCardsHome: 1, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 1, savesAway: 4, passesHome: 430, passesAway: 301 },
    events: [
      { minute: 17, type: 'goal', team: 'home', player: 'Wood', text: 'Ouverture du score néo-zélandaise.' },
      { minute: 41, type: 'info', team: 'home', text: 'Pression constante avant la pause.' },
      { minute: 69, type: 'goal', team: 'home', player: 'Just', text: 'But du break (2-0).' },
      { minute: 76, type: 'card', team: 'away', text: 'Carton jaune côté indien.' },
    ],
    finalHome: 2, finalAway: 0,
  },
  {
    key: 'Romania|Poland',
    preInfo: 'La Roumanie accueille la Pologne pour un duel décisif.',
    liveInfo: 'La Roumanie maîtrise son match à domicile.',
    finishedInfo: 'Terminé: Cicaldau 68’, Man 72’. Victoire 2-0 de la Roumanie.',
    venue: 'Arena Națională, Bucarest',
    referee: 'D. Massa',
    stage: 'UEFA Nations League · Groupe',
    weather: '13°C · frais',
    baseStats: { possessionHome: 53, possessionAway: 47, shotsHome: 12, shotsAway: 7, shotsOnTargetHome: 5, shotsOnTargetAway: 2, cornersHome: 6, cornersAway: 3, foulsHome: 11, foulsAway: 14, yellowCardsHome: 1, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 2, savesAway: 3, passesHome: 410, passesAway: 362 },
    events: [
      { minute: 24, type: 'info', team: 'neutral', text: 'Début de match équilibré.' },
      { minute: 68, type: 'goal', team: 'home', player: 'Cicaldau', text: 'But de Cicaldau (1-0).' },
      { minute: 72, type: 'goal', team: 'home', player: 'Man', text: 'Man double la mise (2-0).' },
      { minute: 80, type: 'card', team: 'away', text: 'Carton jaune pour la Pologne.' },
    ],
    finalHome: 2, finalAway: 0,
  },
  {
    key: 'Sweden|Bosnia-Herzegovina',
    preInfo: 'La Suède reçoit la Bosnie-Herzégovine dans un match ouvert.',
    liveInfo: 'Match spectaculaire avec des buts des deux côtés.',
    finishedInfo: 'Terminé: Svensson 5’, Gyökeres 11’ (pen), 45+2’ (pen) ; Gigovic 47’, Kolašinac 62’.',
    venue: 'Friends Arena, Solna',
    referee: 'J. Pinheiro',
    stage: 'UEFA Nations League · Groupe',
    weather: '7°C · froid',
    baseStats: { possessionHome: 49, possessionAway: 51, shotsHome: 13, shotsAway: 12, shotsOnTargetHome: 7, shotsOnTargetAway: 5, cornersHome: 5, cornersAway: 6, foulsHome: 10, foulsAway: 12, yellowCardsHome: 2, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 3, savesAway: 4, passesHome: 388, passesAway: 401 },
    events: [
      { minute: 5, type: 'goal', team: 'home', player: 'Svensson', text: 'But précoce suédois (1-0).' },
      { minute: 11, type: 'goal', team: 'home', player: 'Gyökeres', text: 'Penalty transformé par Gyökeres (2-0).' },
      { minute: 45, type: 'goal', team: 'home', player: 'Gyökeres', text: 'Gyökeres s’offre un doublé sur penalty (3-0).' },
      { minute: 47, type: 'goal', team: 'away', player: 'Gigovic', text: 'Réduction du score bosnienne (3-1).' },
      { minute: 62, type: 'goal', team: 'away', player: 'Kolašinac', text: 'Kolašinac relance le suspense (3-2).' },
      { minute: 88, type: 'info', team: 'away', text: 'Dernières offensives pour égaliser.' },
    ],
    finalHome: 3, finalAway: 2,
  },
  {
    key: 'Norway|Wales',
    preInfo: 'La Norvège de Haaland affronte le Pays de Galles.',
    liveInfo: 'La Norvège impose sa puissance offensive.',
    finishedInfo: 'Terminé: Nusa 59’, Schjelderup 68’, Haaland 88’ (pen) ; Brooks 79’.',
    venue: 'Ullevaal Stadion, Oslo',
    referee: 'A. Taylor',
    stage: 'UEFA Nations League · Groupe',
    weather: '6°C · ciel couvert',
    baseStats: { possessionHome: 55, possessionAway: 45, shotsHome: 16, shotsAway: 8, shotsOnTargetHome: 7, shotsOnTargetAway: 3, cornersHome: 7, cornersAway: 3, foulsHome: 9, foulsAway: 13, yellowCardsHome: 1, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 2, savesAway: 4, passesHome: 455, passesAway: 332 },
    events: [
      { minute: 59, type: 'goal', team: 'home', player: 'Nusa', text: 'Ouverture du score de Nusa (1-0).' },
      { minute: 68, type: 'goal', team: 'home', player: 'Schjelderup', text: 'Schjelderup fait le break (2-0).' },
      { minute: 79, type: 'goal', team: 'away', player: 'Brooks', text: 'Brooks réduit l’écart (2-1).' },
      { minute: 88, type: 'goal', team: 'home', player: 'Haaland', text: 'Penalty converti par Haaland (3-1).' },
    ],
    finalHome: 3, finalAway: 1,
  },
  {
    key: 'Japan|Brazil',
    preInfo: 'Amical de prestige entre le Japon et le Brésil.',
    liveInfo: 'Match animé avec des renversements de situation.',
    finishedInfo: 'Terminé: Kubo 15’, Nakamura 19’, Sakamoto 90+1’ ; Vinícius Jr 33’, 75’.',
    venue: 'Japan National Stadium, Tokyo',
    referee: 'A. Al-Jassim',
    stage: 'Match amical international',
    weather: '20°C · doux',
    baseStats: { possessionHome: 47, possessionAway: 53, shotsHome: 11, shotsAway: 14, shotsOnTargetHome: 5, shotsOnTargetAway: 6, cornersHome: 4, cornersAway: 7, foulsHome: 12, foulsAway: 9, yellowCardsHome: 2, yellowCardsAway: 1, redCardsHome: 0, redCardsAway: 0, savesHome: 4, savesAway: 2, passesHome: 360, passesAway: 412 },
    events: [
      { minute: 15, type: 'goal', team: 'home', player: 'Kubo', text: 'Kubo ouvre le score (1-0).' },
      { minute: 19, type: 'goal', team: 'home', player: 'Nakamura', text: 'Nakamura double la mise (2-0).' },
      { minute: 33, type: 'goal', team: 'away', player: 'Vinícius Jr', text: 'Vinícius Jr réduit le score (2-1).' },
      { minute: 75, type: 'goal', team: 'away', player: 'Vinícius Jr', text: 'Égalisation de Vinícius Jr (2-2).' },
      { minute: 91, type: 'goal', team: 'home', player: 'Sakamoto', text: 'But vainqueur de Sakamoto dans le temps additionnel !' },
    ],
    finalHome: 3, finalAway: 2,
  },
  {
    key: 'Ecuador|Costa Rica',
    preInfo: 'L’Équateur affronte le Costa Rica en amical.',
    liveInfo: 'L’Équateur contrôle le match.',
    finishedInfo: 'Terminé: victoire 2-0 de l’Équateur.',
    venue: 'Estadio Rodrigo Paz, Quito',
    referee: 'W. Roldán',
    stage: 'Match amical international',
    weather: '17°C · altitude',
    baseStats: { possessionHome: 56, possessionAway: 44, shotsHome: 13, shotsAway: 6, shotsOnTargetHome: 5, shotsOnTargetAway: 1, cornersHome: 6, cornersAway: 2, foulsHome: 10, foulsAway: 13, yellowCardsHome: 1, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 1, savesAway: 3, passesHome: 420, passesAway: 315 },
    events: [
      { minute: 28, type: 'goal', team: 'home', text: 'Ouverture du score équatorienne (1-0).' },
      { minute: 67, type: 'goal', team: 'home', text: 'Deuxième but pour l’Équateur (2-0).' },
      { minute: 73, type: 'card', team: 'away', text: 'Carton jaune côté Costa Rica.' },
    ],
    finalHome: 2, finalAway: 0,
  },
  {
    key: 'Chelsea Women|Manchester City Women',
    preInfo: 'Choc au sommet de la Women’s Super League.',
    liveInfo: 'Duel tactique entre Chelsea et Manchester City.',
    finishedInfo: 'Terminé: Baltimore 45+4’. Chelsea s’impose 1-0.',
    venue: 'Stamford Bridge, Londres',
    referee: 'R. Welch',
    stage: "Women's Super League · Journée clé",
    weather: '12°C · nuageux',
    baseStats: { possessionHome: 51, possessionAway: 49, shotsHome: 10, shotsAway: 9, shotsOnTargetHome: 4, shotsOnTargetAway: 3, cornersHome: 5, cornersAway: 4, foulsHome: 8, foulsAway: 10, yellowCardsHome: 1, yellowCardsAway: 1, redCardsHome: 0, redCardsAway: 0, savesHome: 3, savesAway: 3, passesHome: 402, passesAway: 389 },
    events: [
      { minute: 31, type: 'info', team: 'neutral', text: 'Match très disputé au milieu.' },
      { minute: 45, type: 'goal', team: 'home', player: 'Baltimore', text: 'But de Baltimore juste avant la pause (1-0).' },
      { minute: 70, type: 'sub', team: 'away', text: 'Changements offensifs pour City.' },
    ],
    finalHome: 1, finalAway: 0,
  },
  {
    key: 'Manchester United Women|Crystal Palace Women',
    preInfo: 'Manchester United reçoit Crystal Palace en WSL.',
    liveInfo: 'Manchester United domine à domicile.',
    finishedInfo: 'Terminé: Le Tissier 18’, Terland 65’. Victoire 2-0.',
    venue: 'Leigh Sports Village, Leigh',
    referee: 'K. Dowle',
    stage: "Women's Super League",
    weather: '10°C · sec',
    baseStats: { possessionHome: 60, possessionAway: 40, shotsHome: 17, shotsAway: 5, shotsOnTargetHome: 7, shotsOnTargetAway: 1, cornersHome: 9, cornersAway: 2, foulsHome: 7, foulsAway: 11, yellowCardsHome: 0, yellowCardsAway: 2, redCardsHome: 0, redCardsAway: 0, savesHome: 1, savesAway: 5, passesHome: 498, passesAway: 276 },
    events: [
      { minute: 18, type: 'goal', team: 'home', player: 'Le Tissier', text: 'But de Le Tissier (1-0).' },
      { minute: 65, type: 'goal', team: 'home', player: 'Terland', text: 'Terland marque le deuxième but (2-0).' },
      { minute: 82, type: 'card', team: 'away', text: 'Carton jaune pour Crystal Palace.' },
    ],
    finalHome: 2, finalAway: 0,
  },
];

function matchKey(match: MatchRow): string {
  return `${match.homeTeam}|${match.awayTeam}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function progressStats(base: MatchStats, minute: number, finished: boolean): MatchStats {
  const factor = finished ? 1 : clamp(minute / 90, 0.08, 1);
  const scale = (v: number) => Math.max(0, Math.round(v * factor));
  const possDelta = finished ? 0 : ((minute % 7) - 3);
  const homePoss = clamp(base.possessionHome + possDelta, 35, 65);
  return {
    ...base,
    possessionHome: homePoss,
    possessionAway: 100 - homePoss,
    shotsHome: scale(base.shotsHome),
    shotsAway: scale(base.shotsAway),
    shotsOnTargetHome: scale(base.shotsOnTargetHome),
    shotsOnTargetAway: scale(base.shotsOnTargetAway),
    cornersHome: scale(base.cornersHome),
    cornersAway: scale(base.cornersAway),
    foulsHome: scale(base.foulsHome),
    foulsAway: scale(base.foulsAway),
    yellowCardsHome: scale(base.yellowCardsHome),
    yellowCardsAway: scale(base.yellowCardsAway),
    redCardsHome: scale(base.redCardsHome),
    redCardsAway: scale(base.redCardsAway),
    savesHome: scale(base.savesHome),
    savesAway: scale(base.savesAway),
    passesHome: scale(base.passesHome),
    passesAway: scale(base.passesAway),
  };
}

function formatDisplayMinute(minute: number | null, status: MatchRow['status']): string | null {
  if (minute == null) return null;
  if (status === 'FINISHED') return 'FT';
  if (minute > 90) return `90+${minute - 90}'`;
  return `${minute}'`;
}

function deriveLiveMatch(match: MatchRow): MatchRow & { details: MatchDetails; displayMinute: string | null } {
  const script = LIVE_SCRIPTS.find((s) => s.key === matchKey(match));
  const now = Date.now();
  const kickoff = new Date(match.kickoff).getTime();
  const elapsedMin = Math.floor((now - kickoff) / 60_000);

  let status = match.status;
  let minute: number | null = match.minute;
  let homeScore = match.homeScore;
  let awayScore = match.awayScore;
  let info = match.info;
  let events: MatchEvent[] = [];

  if (script) {
    if (elapsedMin < 0) {
      status = 'UPCOMING';
      minute = null;
      homeScore = 0;
      awayScore = 0;
      info = script.preInfo;
      events = [];
    } else if (elapsedMin <= 95) {
      status = 'LIVE';
      minute = clamp(elapsedMin, 1, 95);
      events = script.events.filter((e) => e.minute <= (minute ?? 0));
      const goalsHome = events.filter((e) => e.type === 'goal' && e.team === 'home').length;
      const goalsAway = events.filter((e) => e.type === 'goal' && e.team === 'away').length;
      homeScore = goalsHome;
      awayScore = goalsAway;
      const last = [...events].reverse().find((e) => e.type === 'goal' || e.type === 'card' || e.type === 'info');
      const dm = formatDisplayMinute(minute, status);
      info = last ? `Live ${dm ?? `${minute}’`}: ${last.text}` : script.liveInfo;
    } else {
      status = 'FINISHED';
      minute = 90;
      events = [...script.events];
      homeScore = script.finalHome;
      awayScore = script.finalAway;
      info = script.finishedInfo;
    }
  } else {
    // Non-scripted: keep DB state but make minute tick if live-ish by time
    if (match.status !== 'FINISHED' && elapsedMin >= 0 && elapsedMin <= 95) {
      status = 'LIVE';
      minute = clamp(elapsedMin, 1, 95);
    } else if (elapsedMin > 95 && match.status !== 'FINISHED') {
      status = 'FINISHED';
      minute = 90;
    }
  }

  const details: MatchDetails = script
    ? {
        venue: script.venue,
        referee: script.referee,
        stage: script.stage,
        broadcast: 'LINAFOOT Live (simulation)',
        weather: script.weather,
        events,
        stats: progressStats(script.baseStats, minute ?? 0, status === 'FINISHED'),
        summary: status === 'UPCOMING' ? script.preInfo : status === 'LIVE' ? script.liveInfo : script.finishedInfo,
      }
    : {
        venue: 'Stade à confirmer',
        referee: 'À confirmer',
        stage: match.league,
        broadcast: 'LINAFOOT Live (simulation)',
        weather: '—',
        events: info ? [{ minute: minute ?? 0, type: 'info', team: 'neutral', text: info }] : [],
        stats: progressStats(
          { possessionHome: 50, possessionAway: 50, shotsHome: 8, shotsAway: 8, shotsOnTargetHome: 3, shotsOnTargetAway: 3, cornersHome: 4, cornersAway: 4, foulsHome: 10, foulsAway: 10, yellowCardsHome: 1, yellowCardsAway: 1, redCardsHome: 0, redCardsAway: 0, savesHome: 2, savesAway: 2, passesHome: 300, passesAway: 300 },
          minute ?? 0,
          status === 'FINISHED',
        ),
        summary: info || `${match.homeTeam} vs ${match.awayTeam}`,
      };

  return { ...match, status, minute, homeScore, awayScore, info, details, displayMinute: formatDisplayMinute(minute, status) };
}

type SelectionId = 'home' | 'draw' | 'away';

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function fluctuate(base: number, matchId: string, market: string, option: string, closed: boolean): number {
  if (closed) return Number(base.toFixed(2));
  const bucket = Math.floor(Date.now() / 10_000);
  const seed = hashSeed(`${matchId}:${market}:${option}:${bucket}`);
  const delta = ((seed % 11) - 5) * 0.03; // -0.15 .. +0.15
  const value = Math.max(1.01, base + delta);
  return Number(value.toFixed(2));
}

function withProbability<T extends { odds: number }>(selections: T[]) {
  const raw = selections.map((selection) => 1 / selection.odds);
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return selections.map((selection, index) => ({
    ...selection,
    probability: Number(((raw[index]! / total) * 100).toFixed(1)),
  }));
}

function buildMarkets(match: MatchRow) {
  const closed = match.status === 'FINISHED';
  const h2h = withProbability([
    { id: 'home' as const, label: '1' as const, odds: fluctuate(match.homeOdds, match.id, 'h2h', 'home', closed) },
    { id: 'draw' as const, label: 'X' as const, odds: fluctuate(match.drawOdds, match.id, 'h2h', 'draw', closed) },
    { id: 'away' as const, label: '2' as const, odds: fluctuate(match.awayOdds, match.id, 'h2h', 'away', closed) },
  ]);
  const goalsBase = 1.75 + ((match.homeOdds + match.awayOdds) / 12);
  const cornersBase = 8.5 + (match.status === 'LIVE' ? 1 : 0.5);
  const cardsBase = 3.5;
  const foulsBase = 22.5;
  return [
    { id: 'h2h', name: 'Résultat (1X2)', selections: h2h },
    { id: 'double_chance', name: 'Double chance', selections: withProbability([
      { id: '1x', label: '1X', odds: fluctuate(Math.max(1.05, 1 / (1 / match.homeOdds + 1 / match.drawOdds) * 0.98), match.id, 'dc', '1x', closed) },
      { id: '12', label: '12', odds: fluctuate(Math.max(1.05, 1 / (1 / match.homeOdds + 1 / match.awayOdds) * 0.98), match.id, 'dc', '12', closed) },
      { id: 'x2', label: 'X2', odds: fluctuate(Math.max(1.05, 1 / (1 / match.drawOdds + 1 / match.awayOdds) * 0.98), match.id, 'dc', 'x2', closed) },
    ])},
    { id: 'goals_ou', name: 'Buts Over/Under 2.5', selections: withProbability([
      { id: 'over_2_5', label: 'Plus de 2.5', odds: fluctuate(goalsBase, match.id, 'goals', 'over', closed) },
      { id: 'under_2_5', label: 'Moins de 2.5', odds: fluctuate(3.55 - goalsBase * 0.55, match.id, 'goals', 'under', closed) },
    ])},
    { id: 'btts', name: 'Les deux équipes marquent', selections: withProbability([
      { id: 'btts_yes', label: 'Oui', odds: fluctuate(1.85, match.id, 'btts', 'yes', closed) },
      { id: 'btts_no', label: 'Non', odds: fluctuate(1.95, match.id, 'btts', 'no', closed) },
    ])},
    { id: 'corners', name: 'Corners Over/Under 9.5', selections: withProbability([
      { id: 'corners_over', label: `Plus de ${cornersBase.toFixed(1)}`, odds: fluctuate(1.88, match.id, 'corners', 'over', closed) },
      { id: 'corners_under', label: `Moins de ${cornersBase.toFixed(1)}`, odds: fluctuate(1.92, match.id, 'corners', 'under', closed) },
    ])},
    { id: 'cards', name: 'Cartons Over/Under 3.5', selections: withProbability([
      { id: 'cards_over', label: `Plus de ${cardsBase}`, odds: fluctuate(1.83, match.id, 'cards', 'over', closed) },
      { id: 'cards_under', label: `Moins de ${cardsBase}`, odds: fluctuate(1.97, match.id, 'cards', 'under', closed) },
    ])},
    { id: 'fouls', name: 'Fautes Over/Under 22.5', selections: withProbability([
      { id: 'fouls_over', label: `Plus de ${foulsBase}`, odds: fluctuate(1.9, match.id, 'fouls', 'over', closed) },
      { id: 'fouls_under', label: `Moins de ${foulsBase}`, odds: fluctuate(1.9, match.id, 'fouls', 'under', closed) },
    ])},
  ];
}

function currentH2hOdds(match: MatchRow): Record<SelectionId, number> {
  const h2h = buildMarkets(match).find((market) => market.id === 'h2h');
  const entries = (h2h?.selections ?? []) as { id: SelectionId; odds: number }[];
  return {
    home: entries.find((s) => s.id === 'home')?.odds ?? match.homeOdds,
    draw: entries.find((s) => s.id === 'draw')?.odds ?? match.drawOdds,
    away: entries.find((s) => s.id === 'away')?.odds ?? match.awayOdds,
  };
}

const demoSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
}).strict();

const filterSchema = z.object({
  filter: z.enum(['all', 'live', 'upcoming']).default('all'),
}).strict();

const betSchema = z.object({
  matchId: z.string().uuid(),
  selection: z.enum(['home', 'draw', 'away']),
  expectedOdds: z.number().finite().gt(1).max(10_000),
  stake: z.number().int().min(10).max(1_000_000_000),
  idempotencyKey: z.string().min(1).max(128).regex(/^[\w.-]+$/),
}).strict();

const matchSelect = `
  SELECT id, league, league_logo AS leagueLogo, home_team AS homeTeam, home_team_logo AS homeTeamLogo,
    away_team AS awayTeam, away_team_logo AS awayTeamLogo,
    kickoff, status, minute, home_score AS homeScore, away_score AS awayScore, info,
    home_odds AS homeOdds, draw_odds AS drawOdds, away_odds AS awayOdds
  FROM matches
`;

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data');
  }
  return result.data;
}

function publicMatch(raw: MatchRow) {
  const match = deriveLiveMatch(raw);
  return {
    id: match.id,
    league: match.league,
    leagueLogo: match.leagueLogo,
    homeTeam: match.homeTeam,
    homeTeamLogo: match.homeTeamLogo,
    awayTeam: match.awayTeam,
    awayTeamLogo: match.awayTeamLogo,
    kickoff: match.kickoff,
    status: match.status,
    minute: match.minute,
    displayMinute: match.displayMinute,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    info: match.info,
    details: match.details,
    markets: buildMarkets(match),
  };
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ bodyLimit: 16 * 1024, logger: false });
  const db = openDatabase(options.databasePath ?? process.env.DATABASE_PATH ?? './data/atlasfoot.sqlite');
  const tokenTtlHours = options.tokenTtlHours ?? Number(process.env.TOKEN_TTL_HOURS ?? 168);
  if (!Number.isFinite(tokenTtlHours) || tokenTtlHours <= 0) {
    db.close();
    throw new Error('TOKEN_TTL_HOURS must be a positive number');
  }

  await app.register(helmet);
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://127.0.0.1:8081')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  await app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Accept', 'Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => errorBody('RATE_LIMITED', 'Too many requests, please try again later'),
  });
  app.decorateRequest('user', null as unknown as AuthUser);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(errorBody(error.code, error.message));
    }
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      && typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode === 400 || statusCode === 413 || statusCode === 414) {
      return reply.code(statusCode).send(errorBody('BAD_REQUEST', 'The request could not be processed'));
    }
    requestSafeLog(app, error);
    return reply.code(statusCode >= 400 && statusCode < 600 ? statusCode : 500)
      .send(errorBody('INTERNAL_ERROR', 'An unexpected error occurred'));
  });
  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send(errorBody('NOT_FOUND', 'Route not found'));
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/api/v1/auth/demo', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = parse(demoSchema, request.body ?? {});
    const id = randomUUID();
    const displayName = body.displayName ?? 'Demo Fan';
    const { token, hash } = createToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokenTtlHours * 60 * 60 * 1000).toISOString();
    const createdAt = now.toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO users (id, display_name, balance, created_at) VALUES (?, ?, 1000, ?)')
        .run(id, displayName, createdAt);
      db.prepare('INSERT INTO auth_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(hash, id, expiresAt, createdAt);
      db.prepare(`INSERT INTO wallet_transactions
        (id, user_id, type, amount, balance_after, description, created_at)
        VALUES (?, ?, 'CREDIT', 1000, 1000, 'Welcome virtual credits', ?)`)
        .run(randomUUID(), id, createdAt);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return reply.code(201).send({ token, user: { id, displayName }, balance: 1000 });
  });

  const auth = authenticate(db);

  app.get('/api/v1/matches', { preHandler: auth }, async (request) => {
    const { filter } = parse(filterSchema, request.query);
    const rows = db.prepare(`${matchSelect}`).all() as unknown as MatchRow[];
    const mapped = rows.map(publicMatch);
    const filtered = filter === 'all' ? mapped : mapped.filter((m) => m.status === filter.toUpperCase());
    filtered.sort((a, b) => {
      const order = { LIVE: 0, UPCOMING: 1, FINISHED: 2 } as const;
      const diff = order[a.status] - order[b.status];
      return diff !== 0 ? diff : a.kickoff.localeCompare(b.kickoff);
    });
    return { matches: filtered };
  });

  function outcomeFor(match: { homeScore: number; awayScore: number }): SelectionId {
    if (match.homeScore > match.awayScore) return 'home';
    if (match.homeScore < match.awayScore) return 'away';
    return 'draw';
  }

  function settleUserBets(userId: string): void {
    const pending = db.prepare(`
      SELECT b.id, b.selection, b.stake, b.potential_payout AS potentialPayout, b.status,
             m.id AS mId, m.league, m.league_logo AS leagueLogo, m.home_team AS homeTeam, m.home_team_logo AS homeTeamLogo,
             m.away_team AS awayTeam, m.away_team_logo AS awayTeamLogo, m.kickoff, m.status AS mStatus, m.minute,
             m.home_score AS homeScore, m.away_score AS awayScore, m.info,
             m.home_odds AS homeOdds, m.draw_odds AS drawOdds, m.away_odds AS awayOdds
      FROM bets b JOIN matches m ON m.id = b.match_id
      WHERE b.user_id = ? AND b.status = 'PENDING'
    `).all(userId) as Array<{
      id: string; selection: SelectionId; stake: number; potentialPayout: number; status: string;
      mId: string; league: string; leagueLogo: string; homeTeam: string; homeTeamLogo: string;
      awayTeam: string; awayTeamLogo: string; kickoff: string; mStatus: MatchRow['status']; minute: number | null;
      homeScore: number; awayScore: number; info: string; homeOdds: number; drawOdds: number; awayOdds: number;
    }>;

    for (const row of pending) {
      const derived = deriveLiveMatch({
        id: row.mId, league: row.league, leagueLogo: row.leagueLogo, homeTeam: row.homeTeam, homeTeamLogo: row.homeTeamLogo,
        awayTeam: row.awayTeam, awayTeamLogo: row.awayTeamLogo, kickoff: row.kickoff, status: row.mStatus, minute: row.minute,
        homeScore: row.homeScore, awayScore: row.awayScore, info: row.info, homeOdds: row.homeOdds, drawOdds: row.drawOdds, awayOdds: row.awayOdds,
      });
      if (derived.status !== 'FINISHED') continue;

      const outcome = outcomeFor(derived);
      const won = row.selection === outcome;
      const newStatus = won ? 'WON' : 'LOST';
      const payoutAmount = won ? row.potentialPayout : 0;
      const settledAt = new Date().toISOString();

      const updated = db.prepare(
        "UPDATE bets SET status = ?, settled_at = ?, payout_amount = ? WHERE id = ? AND user_id = ? AND status = 'PENDING'",
      ).run(newStatus, settledAt, payoutAmount, row.id, userId);
      if (Number(updated.changes) !== 1) continue;

      if (won) {
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number };
        const balanceAfter = user.balance + payoutAmount;
        db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(balanceAfter, userId);
        db.prepare(`INSERT INTO wallet_transactions
          (id, user_id, type, amount, balance_after, description, bet_id, created_at)
          VALUES (?, ?, 'CREDIT', ?, ?, ?, ?, ?)`)
          .run(
            randomUUID(), userId, payoutAmount, balanceAfter,
            `Gain pari: ${row.homeTeam} vs ${row.awayTeam}`, row.id, settledAt,
          );
      }
    }
  }

  app.get('/api/v1/wallet', { preHandler: auth }, async (request) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      settleUserBets(request.user.id);
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(request.user.id) as { balance: number };
      const transactions = db.prepare(`
        SELECT id, type, amount, balance_after AS balanceAfter, description, created_at AS createdAt
        FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC
      `).all(request.user.id);
      db.exec('COMMIT');
      return { balance: user.balance, transactions };
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  const betQuery = `
    SELECT bets.id, bets.match_id AS matchId, bets.selection, bets.odds, bets.stake,
      bets.potential_payout AS potentialPayout, bets.payout_amount AS payoutAmount,
      bets.status, bets.created_at AS createdAt, bets.settled_at AS settledAt,
      matches.home_team AS homeTeam, matches.home_team_logo AS homeTeamLogo,
      matches.away_team AS awayTeam, matches.away_team_logo AS awayTeamLogo,
      matches.league AS league, matches.league_logo AS leagueLogo
    FROM bets JOIN matches ON matches.id = bets.match_id
  `;
  const getBet = (userId: string, betId: string) => {
    const bet = db.prepare(`${betQuery} WHERE bets.user_id = ? AND bets.id = ?`).get(userId, betId) as {
      id: string; matchId: string; selection: 'home' | 'draw' | 'away'; odds: number;
      stake: number; potentialPayout: number; payoutAmount: number; status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
      createdAt: string; settledAt: string | null;
      homeTeam: string; homeTeamLogo: string; awayTeam: string; awayTeamLogo: string; league: string; leagueLogo: string;
    };
    const selectionLabel = { home: '1', draw: 'X', away: '2' }[bet.selection];
    return {
      ...bet,
      match: `${bet.homeTeam} vs ${bet.awayTeam}`,
      selectionLabel,
    };
  };

  app.get('/api/v1/bets', { preHandler: auth }, async (request) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      settleUserBets(request.user.id);
      const rows = db.prepare("SELECT id FROM bets WHERE user_id = ? ORDER BY created_at DESC, rowid DESC")
        .all(request.user.id) as { id: string }[];
      const result = { bets: rows.map(({ id }) => getBet(request.user.id, id)) };
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  app.post('/api/v1/bets', { preHandler: auth }, async (request, reply) => {
    const input = parse(betSchema, request.body);
    const userId = request.user.id;

    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = db.prepare('SELECT id, match_id AS matchId, selection, odds, stake FROM bets WHERE user_id = ? AND idempotency_key = ?')
        .get(userId, input.idempotencyKey) as { id: string; matchId: string; selection: string; odds: number; stake: number } | undefined;
      if (existing) {
        if (existing.matchId !== input.matchId || existing.selection !== input.selection
          || existing.stake !== input.stake || existing.odds !== input.expectedOdds) {
          throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This idempotency key was already used for a different bet');
        }
        const currentUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number };
        const result = { bet: getBet(userId, existing.id), balance: currentUser.balance };
        db.exec('COMMIT');
        return reply.code(201).send(result);
      }

      const rawMatch = db.prepare(`${matchSelect} WHERE id = ?`).get(input.matchId) as MatchRow | undefined;
      if (!rawMatch) throw new AppError(404, 'MATCH_NOT_FOUND', 'Match not found');
      const match = deriveLiveMatch(rawMatch);
      if (match.status === 'FINISHED') throw new AppError(409, 'MATCH_CLOSED', 'Bets are not accepted for this match');

      if (match.status === 'LIVE') {
        const currentMinute = match.minute ?? 0;
        const recentGoal = (match.details.events ?? []).some(
          (e) => e.type === 'goal' && e.minute <= currentMinute && e.minute >= currentMinute - 1,
        );
        if (recentGoal) {
          throw new AppError(409, 'BET_SUSPENDED', 'Paris temporairement suspendus après un but. Réessaie dans un instant.');
        }
      }

      const odds = currentH2hOdds(match)[input.selection];
      if (odds !== input.expectedOdds) {
        throw new AppError(409, 'ODDS_CHANGED', 'The odds have changed; refresh the match and try again');
      }

      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number };
      if (input.stake > user.balance) {
        throw new AppError(409, 'INSUFFICIENT_FUNDS', 'Insufficient virtual credit balance');
      }

      const betId = randomUUID();
      const createdAt = new Date().toISOString();
      const balanceAfter = user.balance - input.stake;
      db.prepare(`INSERT INTO bets
        (id, user_id, match_id, selection, odds, stake, potential_payout, status, idempotency_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`)
        .run(betId, userId, input.matchId, input.selection, odds, input.stake,
          Math.round(input.stake * odds), input.idempotencyKey, createdAt);
      db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(balanceAfter, userId);
      db.prepare(`INSERT INTO wallet_transactions
        (id, user_id, type, amount, balance_after, description, bet_id, created_at)
        VALUES (?, ?, 'DEBIT', ?, ?, ?, ?, ?)`)
        .run(randomUUID(), userId, input.stake, balanceAfter,
          `Bet on ${match.homeTeam} vs ${match.awayTeam}`, betId, createdAt);
      const result = { bet: getBet(userId, betId), balance: balanceAfter };
      db.exec('COMMIT');
      return reply.code(201).send(result);
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  app.addHook('onClose', async () => {
    db.close();
  });

  return app;
}

function requestSafeLog(app: FastifyInstance, error: unknown): void {
  // Keep logging centralized without ever returning stack traces or database details to clients.
  app.log.error({ err: error instanceof Error ? error.name : 'UnknownError' }, 'Request failed');
}
