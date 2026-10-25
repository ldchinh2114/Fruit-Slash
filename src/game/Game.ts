import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { EVENT_SYSTEM_CONFIG } from '../config/eventConfig';
import {
  FRUIT_DEFINITIONS,
  GAME_CONFIG,
  getFruitDefinition,
} from '../config/gameConfig';
import { CurrencyManager } from '../economy/CurrencyManager';
import { RewardService } from '../economy/RewardService';
import { Bomb, BombVisualFactory } from '../entities/Bomb';
import { Fruit, FruitVisualFactory } from '../entities/Fruit';
import { FruitSpawner } from '../entities/FruitSpawner';
import { EventEffectsController } from '../events/EventEffectsController';
import { EventManager } from '../events/EventManager';
import type {
  CoinRewardStatus,
  GameEventDefinition,
} from '../events/EventTypes';
import { CollisionDetector } from '../mechanics/CollisionDetector';
import { LifeManager } from '../mechanics/LifeManager';
import { ScoreManager } from '../mechanics/ScoreManager';
import { SlashController } from '../mechanics/SlashController';
import type { SlashSegment } from '../mechanics/SlashTypes';
import { SaveManager } from '../persistence/SaveManager';
import { EffectsManager } from '../rendering/EffectsManager';
import { ExplosionEffectFactory } from '../rendering/ExplosionEffectFactory';
import { SceneManager } from '../rendering/SceneManager';
import { SlashEffectFactory } from '../rendering/SlashEffectFactory';
import { TrailEffectFactory } from '../rendering/TrailEffectFactory';
import { EquipmentManager } from '../shop/EquipmentManager';
import { getDefaultItem } from '../shop/ShopCatalog';
import { ShopManager } from '../shop/ShopManager';
import { UpgradeManager } from '../shop/UpgradeManager';
import { GameOverScreen, type GameOverResult } from '../ui/GameOverScreen';
import { HUD } from '../ui/HUD';
import { PauseScreen } from '../ui/PauseScreen';
import { SettingsScreen, type ResetOutcome } from '../ui/SettingsScreen';
import { ShopScreen, type ShopFeedback } from '../ui/ShopScreen';
import { StartScreen } from '../ui/StartScreen';
import { DifficultyManager } from './DifficultyManager';
import { GameLoop } from './GameLoop';
import { GameState } from './GameState';

const GAME_OVER_SCREEN_DELAY_MS = 850;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export class Game {
  private readonly sceneManager: SceneManager;
  private readonly fruitFactory = new FruitVisualFactory();
  private readonly bombFactory = new BombVisualFactory();
  private readonly difficulty = new DifficultyManager();
  private readonly score = new ScoreManager();
  private readonly lives = new LifeManager(GAME_CONFIG.startingLives);
  private readonly audio = new AudioManager();
  private readonly save = new SaveManager();
  private readonly currency = new CurrencyManager(this.save);
  private readonly upgrades = new UpgradeManager(this.save, this.currency);
  private readonly slashEffects = new SlashEffectFactory();
  private readonly trailEffects = new TrailEffectFactory();
  private readonly explosionEffects = new ExplosionEffectFactory();
  private readonly equipment = new EquipmentManager(this.save, {
    slash: (item) => {
      this.effects.setSlashStyle(this.slashEffects.create(item.style));
      this.slash.setTrailLifetime(item.style.lifetime);
    },
    background: (item) => {
      this.sceneManager.setBackground(item.style);
      this.requestRender();
    },
    fruitSkin: (item) => {
      this.fruitFactory.setSkinStyle(item.style);
    },
    trail: (item) => {
      this.effects.setTrailStyle(this.trailEffects.create(item.style));
    },
    explosion: (item) => {
      this.effects.setExplosionStyle(this.explosionEffects.create(item.style));
    },
    soundPack: (item) => {
      this.audio.setPack(item.style);
    },
    theme: (item) => {
      this.applyTheme(item.style.vars);
    },
  });
  private readonly reward = new RewardService(this.save, this.upgrades);
  private readonly shop = new ShopManager(
    this.save,
    this.currency,
    this.equipment,
    this.upgrades,
  );
  private readonly effects: EffectsManager;
  private readonly spawner: FruitSpawner;
  private readonly slash: SlashController;
  private readonly collision: CollisionDetector;
  private readonly hud: HUD;
  private readonly startScreen: StartScreen;
  private readonly pauseScreen: PauseScreen;
  private readonly gameOverScreen: GameOverScreen;
  private readonly shopScreen: ShopScreen;
  private readonly settingsScreen: SettingsScreen;
  private readonly eventEffects: EventEffectsController;
  private readonly events: EventManager;
  private readonly loop: GameLoop;

  private state: GameState = GameState.Ready;
  private previousState: GameState = GameState.Ready;
  private playTime = 0;
  private lastUnlockedCount = 0;
  private gameOverTimer: number | null = null;
  private gameOverReady = false;
  private lastGameOverResult: GameOverResult | null = null;
  private runId: string | null = null;
  private fruitsSliced = 0;
  private bombsSliced = 0;
  private comboCount = 0;
  private lastSliceTime = Number.NEGATIVE_INFINITY;
  private lastStrokeId = -1;
  private strokeFruitHits = 0;
  private luckyCoins = 0;
  private disposed = false;
  private preloaded = false;
  private needsRender = true;

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.effects = new EffectsManager(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.fruitFactory,
    );
    this.spawner = new FruitSpawner(
      this.sceneManager.scene,
      this.fruitFactory,
      this.bombFactory,
      this.difficulty,
      () => this.sceneManager.playBounds,
      { onFruitMissed: (fruit) => this.handleFruitMissed(fruit) },
    );
    this.slash = new SlashController(this.sceneManager.renderer.domElement);
    this.collision = new CollisionDetector(this.sceneManager.camera, () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    this.hud = new HUD({
      onPause: () => this.pauseGame(),
      onToggleSound: () => this.toggleSound(),
    });
    this.startScreen = new StartScreen({
      onStart: () => this.startGame(),
      onShop: () => this.openShop(),
      onSettings: () => this.openSettings(),
    });
    this.pauseScreen = new PauseScreen({
      onResume: () => this.resumeGame(),
      onRestart: () => this.startGame(),
      onMenu: () => this.goToMenu(),
    });
    this.gameOverScreen = new GameOverScreen({
      onRestart: () => this.startGame(),
      onMenu: () => this.goToMenu(),
      onShop: () => this.openShop(),
    });
    this.shopScreen = new ShopScreen(this.shop, {
      onClose: () => this.closeShop(),
      onFeedback: (kind) => this.handleShopFeedback(kind),
      onPreviewSound: (item) => {
        if (item.category === 'soundPack') {
          this.audio.previewPack(item.style);
        }
      },
    });
    this.settingsScreen = new SettingsScreen({
      onClose: () => this.closeSettings(),
      onSoundChange: (enabled) => this.handleSoundPreference(enabled),
      onVolumeChange: (volume, commit) =>
        this.handleVolumeChange(volume, commit),
      onResetData: () => this.resetPlayerData(),
    });

    this.eventEffects = new EventEffectsController(
      this.spawner,
      this.effects,
      this.hud,
      this.audio,
    );
    this.events = new EventManager({
      onEventStarted: (definition, presentation) => {
        if (this.state === GameState.Playing) {
          this.eventEffects.handleEventStarted(definition, presentation);
        }
      },
      onEventEnded: (definition) => {
        if (this.state === GameState.Playing) {
          this.eventEffects.handleEventEnded(definition);
        }
      },
      onActiveEventsChanged: (active) => {
        this.eventEffects.handleActiveEventsChanged(active);
      },
      onScoreReward: (_definition, amount) => {
        this.grantEventScore(amount);
      },
      onCoinReward: (definition, amount, once) =>
        this.grantEventCoins(definition, amount, once),
      getLives: () => this.lives.lives,
    });

    this.audio.configure(
      this.save.settings.soundEnabled,
      this.save.settings.volume,
    );
    this.equipment.applyAll();
    this.hud.setSoundEnabled(this.audio.enabled);
    this.hud.setVisible(false);
    this.pauseScreen.hide();
    this.gameOverScreen.hide();
    this.shopScreen.hide();
    this.settingsScreen.hide();
    this.lastUnlockedCount = this.difficulty.unlockedFruitIds.length;
    this.startScreen.show(this.save.statistics.bestScore, this.save.coins);

    this.sceneManager.onResize = this.handleResize;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.loop = new GameLoop(
      (deltaSeconds) => this.tick(deltaSeconds),
      GAME_CONFIG.maxDeltaTime,
    );
    this.loop.start();
  }

  /**
   * Builds every procedural asset and compiles shaders before the menu becomes
   * interactive. This keeps the first game and the first shop visit smooth.
   */
  async preload(
    onProgress?: (fraction: number, status: string, detail?: string) => void,
  ): Promise<void> {
    if (this.preloaded || this.disposed) {
      return;
    }
    this.preloaded = true;
    const report = (
      fraction: number,
      status: string,
      detail?: string,
    ): void => {
      onProgress?.(Math.max(0, Math.min(1, fraction)), status, detail);
    };

    report(0.04, 'Đang tạo trái cây…', 'Chuẩn bị 8 loại trái cây và bom…');
    await nextFrame();
    this.fruitFactory.prewarm(FRUIT_DEFINITIONS);
    this.bombFactory.prewarm();

    report(0.34, 'Đang nạp hiệu ứng…', 'Biên dịch shader và vật liệu 3D…');
    await nextFrame();
    const warmup = new THREE.Group();
    warmup.name = 'preload-warmup';
    for (const definition of FRUIT_DEFINITIONS) {
      const group = this.fruitFactory.createFruit(definition);
      group.position.set(0, 0, 80);
      warmup.add(group);
    }
    const bomb = this.bombFactory.createBomb();
    bomb.position.set(0, 0, 80);
    warmup.add(bomb);
    this.effects.prewarm();
    const warmupFruit = new Fruit(
      FRUIT_DEFINITIONS[0],
      this.fruitFactory.createFruit(FRUIT_DEFINITIONS[0]),
      1,
    );
    warmupFruit.group.position.set(0, 0, 60);
    this.effects.spawnFruitSlice(warmupFruit, new THREE.Vector3(1, 0, 0));
    this.sceneManager.scene.add(warmup);
    try {
      await this.sceneManager.compile();
      // Draw once with the warmup objects present so shadow-map and sprite
      // shader variants are compiled too.
      this.sceneManager.render();
    } finally {
      this.sceneManager.scene.remove(warmup);
      this.effects.reset();
    }

    report(0.68, 'Đang chuẩn bị cửa hàng…', 'Dựng sẵn thẻ vật phẩm…');
    await nextFrame();
    this.shopScreen.prewarm();

    report(0.9, 'Đang hoàn thiện…', 'Vẽ khung hình đầu tiên…');
    await nextFrame();
    this.requestRender();
    this.sceneManager.render();
    this.needsRender = false;
    report(1, 'Đã sẵn sàng', 'Bắt đầu chém trái cây!');
    await nextFrame();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.loop.stop();
    this.clearGameOverTimer();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.sceneManager.onResize = null;
    this.events.endRun();
    this.eventEffects.reset();
    this.slash.destroy();
    this.hud.destroy();
    this.startScreen.destroy();
    this.pauseScreen.destroy();
    this.gameOverScreen.destroy();
    this.shopScreen.destroy();
    this.settingsScreen.destroy();
    this.effects.dispose();
    this.spawner.dispose();
    this.fruitFactory.dispose();
    this.bombFactory.dispose();
    this.audio.dispose();
    this.sceneManager.dispose();
  }

  private tick(deltaSeconds: number): void {
    if (this.disposed) {
      return;
    }
    const isAnimating =
      this.state === GameState.Playing ||
      (this.state === GameState.GameOver && !this.gameOverReady);
    if (isAnimating || this.needsRender) {
      this.sceneManager.update(deltaSeconds);
    }

    switch (this.state) {
      case GameState.Playing:
        this.updatePlaying(deltaSeconds);
        break;
      case GameState.GameOver:
        this.effects.update(deltaSeconds);
        break;
      case GameState.Paused:
      case GameState.Ready:
      case GameState.Shop:
      case GameState.Settings:
        break;
    }

    // Menus, settings and the shop are static: render once when something
    // changes instead of keeping the WebGL scene at 60fps underneath them.
    if (isAnimating || this.needsRender) {
      this.sceneManager.render();
      this.needsRender = false;
    }
  }

  private requestRender(): void {
    this.needsRender = true;
  }

  private updatePlaying(deltaSeconds: number): void {
    this.playTime += deltaSeconds;
    this.difficulty.update(this.playTime);
    this.events.tick(deltaSeconds);
    this.eventEffects.update(deltaSeconds);
    this.spawner.update(deltaSeconds, this.events.motionScale);
    this.processSlashInput();
    this.slash.update();
    this.effects.update(deltaSeconds);
    this.effects.updateEntityTrails(
      deltaSeconds,
      this.spawner.activeFruits,
      this.spawner.activeBombs,
    );
    this.effects.updateSlashTrail(
      this.slash.trailPoints,
      window.innerWidth,
      window.innerHeight,
    );
    this.effects.updateSlashSparks(deltaSeconds);
    this.updateHud();
  }

  private startGame(): void {
    if (
      this.state === GameState.Playing ||
      this.state === GameState.Shop ||
      this.state === GameState.Settings
    ) {
      return;
    }
    this.audio.unlock();
    this.resetSession();
    this.runId = this.createRunId();
    this.clearGameOverTimer();
    this.pauseScreen.hide();
    this.gameOverScreen.hide();
    this.startScreen.hide();
    this.state = GameState.Playing;
    this.events.startRun(this.save.statistics.bestCombo);
    this.hud.setVisible(true);
    this.hud.setPaused(false);
    this.slash.setEnabled(true);
    this.audio.playStart();
  }

  private pauseGame(): void {
    if (this.state !== GameState.Playing) {
      return;
    }
    this.state = GameState.Paused;
    this.slash.setEnabled(false);
    this.slash.reset();
    this.effects.hideSlashTrail();
    this.hud.setPaused(true);
    this.pauseScreen.show();
    this.audio.playUi();
    this.requestRender();
  }

  private resumeGame(): void {
    if (this.state !== GameState.Paused) {
      return;
    }
    this.pauseScreen.hide();
    this.state = GameState.Playing;
    this.hud.setPaused(false);
    this.slash.setEnabled(true);
    this.audio.playUi();
  }

  private goToMenu(): void {
    if (this.state !== GameState.Paused && this.state !== GameState.GameOver) {
      return;
    }
    this.resetSession();
    this.state = GameState.Ready;
    this.hud.setVisible(false);
    this.pauseScreen.hide();
    this.gameOverScreen.hide();
    this.shopScreen.hide();
    this.settingsScreen.hide();
    this.startScreen.show(this.save.statistics.bestScore, this.save.coins);
    this.audio.playUi();
    this.requestRender();
  }

  private openShop(): void {
    if (this.state !== GameState.Ready && this.state !== GameState.GameOver) {
      return;
    }
    this.audio.unlock();
    this.previousState = this.state;
    this.state = GameState.Shop;
    this.startScreen.hide();
    this.gameOverScreen.hide();
    this.hud.setVisible(false);
    this.slash.setEnabled(false);
    this.slash.reset();
    this.effects.reset();
    this.spawner.reset();
    this.shopScreen.show();
    this.audio.playUi();
    this.requestRender();
  }

  private closeShop(): void {
    if (this.state !== GameState.Shop) {
      return;
    }
    this.shopScreen.hide();
    this.audio.playUi();
    this.requestRender();
    if (this.previousState === GameState.GameOver) {
      this.state = GameState.GameOver;
      if (this.lastGameOverResult) {
        this.lastGameOverResult.coinBalance = this.shop.balance;
        this.gameOverScreen.show(this.lastGameOverResult);
      }
      return;
    }
    this.state = GameState.Ready;
    this.startScreen.show(this.save.statistics.bestScore, this.shop.balance);
  }

  private openSettings(): void {
    if (this.state !== GameState.Ready) {
      return;
    }
    this.audio.unlock();
    this.previousState = GameState.Ready;
    this.state = GameState.Settings;
    this.startScreen.hide();
    this.settingsScreen.show(
      { ...this.save.settings },
      { ...this.save.statistics },
    );
    this.audio.playUi();
    this.requestRender();
  }

  private closeSettings(): void {
    if (this.state !== GameState.Settings) {
      return;
    }
    this.settingsScreen.hide();
    this.state = GameState.Ready;
    this.startScreen.show(this.save.statistics.bestScore, this.save.coins);
    this.audio.playUi();
    this.requestRender();
  }

  private handleShopFeedback(kind: ShopFeedback): void {
    switch (kind) {
      case 'purchase':
        this.audio.playPurchase();
        break;
      case 'equip':
        this.audio.playEquip();
        break;
      case 'preview':
        this.audio.playPreview();
        break;
      case 'error':
        this.audio.playError();
        break;
      case 'ui':
        this.audio.playUi();
        break;
    }
  }

  private handleSoundPreference(enabled: boolean): boolean {
    const saved = this.save.transaction((draft) => {
      draft.settings.soundEnabled = enabled;
    });
    if (!saved) {
      return false;
    }
    this.audio.setEnabled(enabled);
    this.hud.setSoundEnabled(this.audio.enabled);
    return true;
  }

  private handleVolumeChange(volume: number, commit: boolean): number {
    this.audio.setVolume(volume);
    if (!commit) {
      return this.audio.volume;
    }
    const saved = this.save.transaction((draft) => {
      draft.settings.volume = this.audio.volume;
    });
    if (!saved) {
      this.audio.setVolume(this.save.settings.volume);
    }
    return this.audio.volume;
  }

  private resetPlayerData(): ResetOutcome {
    const ok = this.save.reset();
    if (ok) {
      this.audio.configure(
        this.save.settings.soundEnabled,
        this.save.settings.volume,
      );
      this.equipment.applyAll();
      this.hud.setSoundEnabled(this.audio.enabled);
      this.lastGameOverResult = null;
    }
    return {
      ok,
      settings: { ...this.save.settings },
      statistics: { ...this.save.statistics },
    };
  }

  private handleGameOver(): void {
    if (this.state !== GameState.Playing) {
      return;
    }
    this.state = GameState.GameOver;
    const finalBestCombo = this.events.bestCombo;
    this.events.endRun();
    this.eventEffects.reset();
    this.slash.setEnabled(false);
    this.slash.reset();
    this.effects.hideSlashTrail();
    this.hud.setPaused(true);
    this.gameOverReady = false;

    const finalScore = this.score.score;
    const finalTime = this.playTime;
    const finalLevel = this.difficulty.level;
    const previousBest = this.save.statistics.bestScore;
    const runId = this.runId ?? this.createRunId();
    this.runId = null;

    const reward = this.reward.grantRunReward({
      runId,
      score: finalScore,
      fruitsSliced: this.fruitsSliced,
      bombsSliced: this.bombsSliced,
      bestCombo: finalBestCombo,
      luckyCoins: this.luckyCoins,
    });

    this.lastGameOverResult = {
      score: finalScore,
      timeSeconds: finalTime,
      level: finalLevel,
      bestScore: this.save.statistics.bestScore,
      isNewBest: reward.saved && finalScore > previousBest,
      coinsEarned: reward.coinsEarned,
      luckyCoins: reward.luckyCoins,
      coinBalance: reward.balance,
      rewardSaved: reward.saved,
    };

    this.audio.playGameOver();

    this.gameOverTimer = window.setTimeout(() => {
      this.gameOverTimer = null;
      if (this.state !== GameState.GameOver) {
        return;
      }
      this.gameOverReady = true;
      this.hud.setVisible(false);
      if (this.lastGameOverResult) {
        this.gameOverScreen.show(this.lastGameOverResult);
      }
    }, GAME_OVER_SCREEN_DELAY_MS);
  }

  private resetSession(): void {
    this.clearGameOverTimer();
    this.gameOverReady = false;
    this.lastGameOverResult = null;
    this.runId = null;
    this.playTime = 0;
    this.fruitsSliced = 0;
    this.bombsSliced = 0;
    this.comboCount = 0;
    this.lastSliceTime = Number.NEGATIVE_INFINITY;
    this.lastStrokeId = -1;
    this.strokeFruitHits = 0;
    this.luckyCoins = 0;
    this.difficulty.reset();
    this.score.reset();
    this.lives.reset(GAME_CONFIG.startingLives);
    this.spawner.reset();
    this.effects.reset();
    this.events.resetRun();
    this.eventEffects.reset();
    this.sceneManager.resetShake();
    this.slash.setEnabled(false);
    this.slash.reset();
    this.hud.setScore(0);
    this.hud.setLives(GAME_CONFIG.startingLives);
    this.hud.setTime(0);
    this.hud.setLevel(1);
    this.hud.setCombo(0, 0);
    this.hud.setPaused(false);
    this.lastUnlockedCount = this.difficulty.unlockedFruitIds.length;
  }

  private processSlashInput(): void {
    const segments = this.slash.consumeSegments();
    if (segments.length === 0) {
      return;
    }
    const hits = this.collision.detect(
      segments,
      this.spawner.activeFruits,
      this.spawner.activeBombs,
    );
    for (const hit of hits) {
      if (this.state !== GameState.Playing) {
        break;
      }
      if (hit.kind === 'fruit') {
        this.sliceFruit(hit.fruit, hit.segment);
      } else {
        this.explodeBomb(hit.bomb);
      }
    }

    if (this.state !== GameState.Playing) {
      return;
    }
    const nearMiss = this.collision.detectNearMiss(
      segments,
      this.spawner.activeBombs,
      EVENT_SYSTEM_CONFIG.randomEvents.nearMissMarginPx,
    );
    if (nearMiss) {
      this.handleNearMiss(nearMiss);
    }
  }

  private sliceFruit(fruit: Fruit, segment: SlashSegment): void {
    if (fruit.sliced || fruit.missed) {
      return;
    }
    fruit.sliced = true;
    this.fruitsSliced += 1;
    if (this.slash.strokeId !== this.lastStrokeId) {
      this.lastStrokeId = this.slash.strokeId;
      this.strokeFruitHits = 0;
    }
    this.strokeFruitHits += 1;
    this.registerComboSlice();

    const comboBonus = this.upgrades.getComboBonus(this.comboCount);
    // Multiplication order: base -> special fruit -> upgrades -> active
    // events, rounded once; additive bonuses are applied afterwards.
    const multiplied =
      fruit.definition.points *
      fruit.scoreMultiplier *
      this.upgrades.getScoreMultiplier() *
      this.events.scoreMultiplier;
    const points =
      Math.max(1, Math.round(multiplied)) +
      comboBonus +
      this.events.sliceBonus;
    const position = fruit.group.position.clone();

    this.effects.spawnFruitSlice(fruit, this.getSlashDirection(segment));
    this.effects.spawnFloatingText(
      `+${points}`,
      fruit.special === 'golden'
        ? '#ffd166'
        : fruit.special === 'rainbow'
          ? '#ffa6f2'
          : '#ffe27a',
      position,
    );
    this.score.addFruit(points);
    this.audio.playPop(points);
    this.events.notifyFruitSliced({
      fruitId: fruit.definition.id,
      combo: this.comboCount,
      sameSwipeFruitCount: this.strokeFruitHits,
      points,
    });
    this.events.notifyScore(this.score.score);

    const lucky = this.upgrades.rollLuckyDrop();
    if (lucky > 0) {
      this.luckyCoins += lucky;
      this.effects.spawnFloatingText(
        `+${lucky} Coins`,
        '#7ef0a5',
        position.clone().add(new THREE.Vector3(0, -0.55, 0)),
      );
    }

    this.spawner.removeFruit(fruit);
    this.updateHud();
  }

  private registerComboSlice(): void {
    if (
      this.comboCount > 0 &&
      this.playTime - this.lastSliceTime <=
        this.upgrades.getComboWindowSeconds()
    ) {
      this.comboCount += 1;
    } else {
      if (this.comboCount > 0) {
        this.events.notifyCombo(0);
      }
      this.comboCount = 1;
    }
    this.lastSliceTime = this.playTime;
    this.events.notifyCombo(this.comboCount);
  }

  private explodeBomb(bomb: Bomb): void {
    if (bomb.exploded) {
      return;
    }
    bomb.exploded = true;
    this.bombsSliced += 1;
    this.comboCount = 0;
    this.lastSliceTime = Number.NEGATIVE_INFINITY;
    this.events.notifyBomb();
    const position = bomb.group.position.clone();
    this.spawner.removeBomb(bomb);
    const feedback = this.effects.spawnBombExplosion(position);
    this.sceneManager.shake(feedback.shakeStrength, feedback.shakeDuration);
    this.hud.flashDamage();
    this.audio.playBomb(feedback.sound);
    this.lives.loseLife();
    this.updateHud();
    if (this.lives.isGameOver) {
      this.handleGameOver();
    }
  }

  private handleFruitMissed(fruit: Fruit): void {
    if (this.state !== GameState.Playing) {
      return;
    }
    this.comboCount = 0;
    this.lastSliceTime = Number.NEGATIVE_INFINITY;
    this.events.notifyMiss();
    const penalty = this.score.penalizeMiss(
      fruit.definition.points * fruit.scoreMultiplier,
      this.upgrades.getMissPenaltyFactor(),
    );
    this.audio.playMiss();
    if (penalty > 0) {
      const bounds = this.sceneManager.playBounds;
      const position = new THREE.Vector3(
        Math.max(
          bounds.left + 1,
          Math.min(bounds.right - 1, fruit.group.position.x),
        ),
        bounds.bottom + 0.9,
        0.6,
      );
      this.effects.spawnFloatingText(`-${penalty}`, '#ff8095', position);
    }
    this.updateHud();
  }

  private handleNearMiss(bomb: Bomb): void {
    if (!this.events.notifyNearMiss()) {
      return;
    }
    const position = bomb.group.position
      .clone()
      .add(new THREE.Vector3(0, 0.6, 0.4));
    this.effects.spawnFloatingText('Suýt trúng!', '#7ee8fa', position);
  }

  private grantEventScore(amount: number): void {
    this.score.addBonus(amount);
    this.hud.setScore(this.score.score);
    this.events.notifyScore(this.score.score);
  }

  private grantEventCoins(
    definition: GameEventDefinition,
    amount: number,
    once: boolean,
  ): CoinRewardStatus {
    if (once) {
      const result = this.currency.grantOnce(
        `achievement:${definition.id}`,
        amount,
      );
      if (result.status === 'granted') {
        return 'granted';
      }
      return result.status === 'already-claimed'
        ? 'already-claimed'
        : 'failed';
    }
    return this.currency.credit(amount) ? 'granted' : 'failed';
  }

  private updateHud(): void {
    this.hud.setScore(this.score.score);
    this.hud.setLives(this.lives.lives);
    this.hud.setTime(this.playTime);
    this.hud.setLevel(this.difficulty.level);

    const comboWindow = this.upgrades.getComboWindowSeconds();
    const comboElapsed = this.playTime - this.lastSliceTime;
    const comboRemaining =
      comboWindow > 0 ? 1 - comboElapsed / comboWindow : 0;
    this.hud.setCombo(this.comboCount, comboRemaining);

    const unlocked = this.difficulty.unlockedFruitIds;
    if (
      this.state === GameState.Playing &&
      unlocked.length > this.lastUnlockedCount
    ) {
      const latestId = unlocked[unlocked.length - 1];
      const definition = getFruitDefinition(latestId);
      this.hud.showToast(`Mở khóa: ${definition.name}`);
      this.audio.playUnlock();
      this.lastUnlockedCount = unlocked.length;
    }
  }

  private getSlashDirection(segment: SlashSegment): THREE.Vector3 {
    const camera = this.sceneManager.camera;
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const direction = right
      .multiplyScalar(segment.to.x - segment.from.x)
      .addScaledVector(up, -(segment.to.y - segment.from.y));
    direction.z = 0;
    if (direction.lengthSq() < 0.0001) {
      direction.set(1, 0, 0);
    } else {
      direction.normalize();
    }
    return direction;
  }

  private toggleSound(): void {
    if (!this.handleSoundPreference(!this.audio.enabled)) {
      this.hud.showToast('Không thể lưu cài đặt âm thanh.');
    }
  }

  private createRunId(): string {
    if (typeof window.crypto?.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `run-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  private applyTheme(vars: Record<string, string>): void {
    const root = document.documentElement;
    const defaultTheme = getDefaultItem('theme');
    if (defaultTheme.category === 'theme') {
      for (const [name, value] of Object.entries(defaultTheme.style.vars)) {
        root.style.setProperty(name, value);
      }
    }
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
  }

  private clearGameOverTimer(): void {
    if (this.gameOverTimer !== null) {
      window.clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
  }

  private readonly handleResize = (): void => {
    this.slash.reset();
    this.effects.hideSlashTrail();
    this.requestRender();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }
    const key = event.key.toLowerCase();
    const target = event.target;
    const isInteractiveTarget =
      target instanceof HTMLElement &&
      (target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT');

    if (key === 'escape') {
      if (this.state === GameState.Shop) {
        event.preventDefault();
        this.closeShop();
        return;
      }
      if (this.state === GameState.Settings) {
        event.preventDefault();
        this.closeSettings();
        return;
      }
    }

    if (key === 'p' || key === 'escape') {
      if (this.state === GameState.Playing) {
        event.preventDefault();
        this.pauseGame();
      } else if (this.state === GameState.Paused) {
        event.preventDefault();
        this.resumeGame();
      }
      return;
    }

    if (isInteractiveTarget && (key === 'enter' || key === ' ')) {
      return;
    }

    if (key === 'enter' || key === ' ') {
      if (this.state === GameState.Ready) {
        event.preventDefault();
        this.startGame();
      } else if (this.state === GameState.GameOver && this.gameOverReady) {
        event.preventDefault();
        this.startGame();
      }
    }
  };

  private readonly handleWindowBlur = (): void => {
    if (this.state === GameState.Playing) {
      this.pauseGame();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden && this.state === GameState.Playing) {
      this.pauseGame();
    }
  };
}
