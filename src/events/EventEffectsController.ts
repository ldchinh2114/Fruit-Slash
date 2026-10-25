import type { AudioManager } from '../audio/AudioManager';
import type { FruitSpawner } from '../entities/FruitSpawner';
import type { EffectsManager } from '../rendering/EffectsManager';
import type { HUD } from '../ui/HUD';
import type {
  ActiveEventInfo,
  EventPresentation,
  GameEventDefinition,
} from './EventTypes';

interface PendingBombBurst {
  remainingSeconds: number;
  readonly bombCount: number;
  readonly definitionId: string;
}

/**
 * Translates event lifecycle callbacks into presentation and spawn side
 * effects. All gameplay rules stay inside EventManager; this class only talks
 * to the existing renderer, HUD, audio and spawner systems.
 */
export class EventEffectsController {
  private pendingBombBursts: PendingBombBurst[] = [];
  private tintSignature = '';

  constructor(
    private readonly spawner: FruitSpawner,
    private readonly effects: EffectsManager,
    private readonly hud: HUD,
    private readonly audio: AudioManager,
  ) {}

  handleEventStarted(
    definition: GameEventDefinition,
    presentation: EventPresentation,
  ): void {
    // Achievements fire often and their rewards/celebration already give
    // feedback; skip the card so the HUD stays readable on small screens.
    if (definition.category !== 'achievement') {
      this.hud.showEvent(definition, presentation);
    }
    this.audio.playEventStart(definition.rarity);
    if (definition.visual?.celebrate !== false) {
      const intensity =
        definition.rarity === 'legendary'
          ? 1.5
          : definition.rarity === 'epic'
            ? 1.2
            : 1;
      this.effects.spawnEventCelebration(
        definition.visual?.color ?? 0x7ee8fa,
        intensity,
      );
    }

    const spawn = definition.spawn;
    if (!spawn) {
      return;
    }
    if (spawn.fruitCount) {
      this.spawner.spawnFruitBurst(spawn.fruitCount);
    }
    if (spawn.specialFruit && spawn.specialFruitCount) {
      this.spawner.spawnSpecialFruitBurst(
        spawn.specialFruit,
        spawn.specialFruitCount,
        spawn.specialScoreMultiplier ?? 1,
        spawn.specialLifetime ?? 6,
      );
    }
    if (spawn.bombCount && spawn.bombCount > 0) {
      const warning = spawn.warningSeconds ?? 0;
      if (warning > 0) {
        this.pendingBombBursts.push({
          remainingSeconds: warning,
          bombCount: spawn.bombCount,
          definitionId: definition.id,
        });
        this.hud.showToast(
          `Cảnh báo: bom tăng cường xuất hiện sau ${Math.ceil(warning)} giây!`,
        );
        this.audio.playEventWarning();
      } else {
        this.spawner.spawnBombBurst(spawn.bombCount);
      }
    }
  }

  handleActiveEventsChanged(active: readonly ActiveEventInfo[]): void {
    this.hud.updateActiveEvents(active);

    let tinted: GameEventDefinition | null = null;
    for (const event of active) {
      const visual = event.definition.visual;
      if (!visual || (visual.slashCore === undefined && visual.slashEdge === undefined)) {
        continue;
      }
      if (!tinted || event.definition.priority > tinted.priority) {
        tinted = event.definition;
      }
    }

    const signature = tinted
      ? `${tinted.visual?.slashCore ?? 'x'}:${tinted.visual?.slashEdge ?? 'x'}`
      : '';
    if (signature === this.tintSignature) {
      return;
    }
    this.tintSignature = signature;
    this.effects.setEventSlashTint(
      tinted?.visual?.slashCore ?? null,
      tinted?.visual?.slashEdge ?? null,
    );
  }

  update(deltaSeconds: number): void {
    if (this.pendingBombBursts.length === 0) {
      return;
    }
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, deltaSeconds)
      : 0;
    for (
      let index = this.pendingBombBursts.length - 1;
      index >= 0;
      index -= 1
    ) {
      const pending = this.pendingBombBursts[index];
      pending.remainingSeconds -= delta;
      if (pending.remainingSeconds > 0) {
        continue;
      }
      this.pendingBombBursts.splice(index, 1);
      if (this.spawner.spawnBombBurst(pending.bombCount) > 0) {
        this.hud.showToast('Bom tăng cường xuất hiện!');
      }
    }
  }

  handleEventEnded(definition: GameEventDefinition): void {
    this.pendingBombBursts = this.pendingBombBursts.filter((pending) => {
      return pending.definitionId !== definition.id;
    });
    if (definition.duration) {
      this.audio.playEventEnd();
    }
  }

  reset(): void {
    this.pendingBombBursts = [];
    this.tintSignature = '';
    this.effects.setEventSlashTint(null, null);
    this.hud.clearEventUI();
  }
}
