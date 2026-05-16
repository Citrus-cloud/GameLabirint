// Файл: magic-maze/js/main.js
// Инициализация, основной игровой цикл, управление состояниями.
//
// === КЛЮЧЕВЫЕ ОПТИМИЗАЦИИ ОТЗЫВЧИВОСТИ И FPS ===
// 1. Ввод обрабатывается через InputManager (input.js), который вызывает
//    tryMove() СИНХРОННО прямо из обработчика touchmove/keydown.
//    Это устраняет задержку «один кадр на каждый свайп».
// 2. Если лисёнок уже в движении — следующий ход буферизуется (1 шт),
//    и применяется как только текущая клетка достигнута. Никакой блокировки ввода.
// 3. requestAnimationFrame без искусственного троттлинга: браузер сам выровняет до VSync.
// 4. Шаг логики врагов фиксированный (200 мс) с интерполяцией между шагами.
// 5. Fog/туман пересчитывает маску только при смене клетки игрока.
// 6. Все аккумуляторные таймеры используют deltaTime, ограниченный сверху (50 мс),
//    чтобы лисёнок не «проскакивал» сквозь стены при пропуске кадра.

class Game {
    constructor() {
        // Canvas и контекст
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Системы
        this.renderer = new Renderer(this.canvas);
        this.particles = new ParticleSystem();
        this.audio = new AudioManager();
        this.storage = new GameStorage();
        this.enemyManager = new EnemyManager();
        this.powerUpManager = new PowerUpManager();
        this.skinShop = new SkinShop();
        this.skinEffects = new SkinEffectsSystem();
        this.lightning = new LightningSystem();

        // Новые механики
        this.crystalRunners = new CrystalRunnerManager();
        this.ghostWalls = new GhostWallSystem();
        this.lineLightning = new LineLightningSystem();
        this.magicFlowers = new MagicFlowerManager();
        this.fogLevel = new FogLevelSystem();
        this.crystalFever = new CrystalFeverSystem();

        // Меню
        this.menu = new MenuSystem(this.canvas, this.ctx);

        // Состояние
        this.state = GAME_CONSTANTS.STATES.MENU;
        this.level = 1;
        this.player = null;
        this.maze = null;
        this.portal = null;
        this.bonusRoom = new BonusRoom();
        this.activePowerEffect = null;

        // Данные уровня
        this.levelData = null;
        this.cellSize = GAME_CONSTANTS.CELL_SIZE;
        this.mazeWidth = 0;
        this.mazeHeight = 0;

        // Таймеры
        this.lastTime = 0;
        this.levelIntroTimer = 0;
        this.levelIntroMaxTime = 2000;
        this.levelCompleteTimer = 0;

        // Движущиеся стены
        this.movingWalls = [];

        // Звук зарядки молнии
        this.lightningChargeSound = null;

        // Таймер звуков скинов при движении
        this.skinSoundTimer = 0;

        // Буфер следующего хода (максимум одно направление в очереди)
        // Никаких массивов: храним только последнее направление, чтобы новый свайп
        // мгновенно перебивал старый и игрок не «доезжал» по устаревшим командам.
        this.bufferedDir = null;

        // Менеджер ввода — все события (touch, mouse, keyboard) проходят через него.
        // Свайпы вызывают tryMove() СРАЗУ из touchmove (моментальная реакция).
        this.input = new InputManager(this.canvas);
        this.input.onDirection = (dir) => this._onDirection(dir);
        this.input.onTap = (x, y) => this._onTap(x, y);
        this.input.onPause = () => this._onPauseKey();

        // Ресайз окна
        window.addEventListener('resize', () => this.resizeCanvas());

        // Запуск цикла
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // Адаптивный размер Canvas с учётом DPR (но рендер всё равно в координатах canvas)
    resizeCanvas() {
        const maxW = Math.min(500, window.innerWidth);
        const maxH = Math.min(700, window.innerHeight);
        this.canvas.width = maxW;
        this.canvas.height = maxH;
        if (this.renderer) {
            this.renderer.width = maxW;
            this.renderer.height = maxH;
            // Сбрасываем кеш стен, т.к. размеры изменились
            this.renderer.invalidateWallCache();
        }
        if (this.menu) {
            this.menu.width = maxW;
            this.menu.height = maxH;
        }
    }

    // ======================================================================
    // ВВОД: МГНОВЕННАЯ РЕАКЦИЯ
    // Метод вызывается СИНХРОННО из обработчика свайпа/клавиши.
    // Если игрок не в движении — ход применяется немедленно;
    // иначе — кладём в bufferedDir, чтобы применить сразу после достижения клетки.
    // ======================================================================
    _onDirection(dir) {
        // Не реагируем в меню/паузе/проигрыше — там это работает только через тапы по кнопкам.
        if (this.state !== GAME_CONSTANTS.STATES.PLAYING &&
            this.state !== GAME_CONSTANTS.STATES.BONUS_ROOM) {
            return;
        }

        // Если идём — буферизуем: новый свайп всегда перетирает старый,
        // т.е. пользователь чувствует, что игра «слышит» его последнее намерение.
        if (this.player && this.player.isMoving) {
            this.bufferedDir = dir;
            return;
        }

        // Иначе — пробуем шагнуть прямо сейчас.
        this._tryMove(dir);
    }

    // Попытка движения в направлении dir. Возвращает true, если ход состоялся.
    _tryMove(dir) {
        if (!this.player) return false;

        let dx = 0, dy = 0;
        switch (dir) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
            default: return false;
        }

        const newX = this.player.gridX + dx;
        const newY = this.player.gridY + dy;

        const matrix = this.state === GAME_CONSTANTS.STATES.BONUS_ROOM
            ? this.bonusRoom.matrix
            : this.levelData.matrix;

        // Проверки границ и стен
        if (newX < 0 || newX >= matrix[0].length || newY < 0 || newY >= matrix.length) return false;
        if (matrix[newY][newX] === GAME_CONSTANTS.CELL_TYPES.WALL) return false;

        // Движущиеся стены
        for (const w of this.movingWalls) {
            if (w.isBlocking && w.pos.x === newX && w.pos.y === newY) return false;
        }
        // Призрачные стены
        if (this.ghostWalls.isBlocked(newX, newY)) return false;

        // Сразу переключаем грид-координаты — это даёт «нулевую задержку» отклика:
        // визуальная анимация догоняет, но логика игры (столкновения, кристаллы)
        // моментально отражает новое положение лисёнка.
        this.player.moveTo(newX, newY);
        this.player.resetIdleTimer();
        this.audio.playMove();
        this.lightning.updatePlayerDirection(dir);
        return true;
    }

    // Тап (клик/короткое касание) — для меню и паузы
    _onTap(x, y) {
        if (this.state === GAME_CONSTANTS.STATES.PAUSED) {
            const btn = this.menu.getButtonAt(x, y, 'pause', false);
            if (btn === 'resume') {
                this.state = GAME_CONSTANTS.STATES.PLAYING;
            } else if (btn === 'shop') {
                this._shopReturnState = GAME_CONSTANTS.STATES.PAUSED;
                this.state = GAME_CONSTANTS.STATES.SHOP;
                this.skinShop.open();
            } else if (btn === 'menu') {
                this.state = GAME_CONSTANTS.STATES.MENU;
            }
            return;
        }

        if (this.state === GAME_CONSTANTS.STATES.MENU) {
            const btn = this.menu.getButtonAt(x, y, 'menu', this.storage.hasSave());
            if (btn === 'play') this._startNewGame();
            else if (btn === 'continue') this._continueGame();
            else if (btn === 'shop') {
                this._shopReturnState = GAME_CONSTANTS.STATES.MENU;
                this.state = GAME_CONSTANTS.STATES.SHOP;
                this.skinShop.open();
            }
            return;
        }

        if (this.state === GAME_CONSTANTS.STATES.GAME_OVER) {
            const btn = this.menu.getButtonAt(x, y, 'gameover', false);
            if (btn === 'restart') this._startNewGame();
            else if (btn === 'menu') this.state = GAME_CONSTANTS.STATES.MENU;
            return;
        }

        if (this.state === GAME_CONSTANTS.STATES.SHOP) {
            const btn = this.menu.getButtonAt(x, y, 'shop', false);
            if (btn === 'close') {
                this.skinShop.close();
                this.state = this._shopReturnState || GAME_CONSTANTS.STATES.MENU;
                return;
            }
            const result = this.skinShop.handleClick(x, y, this.canvas.width, this.canvas.height);
            if (result === 'close') {
                this.skinShop.close();
                this.state = this._shopReturnState || GAME_CONSTANTS.STATES.MENU;
            }
            return;
        }

        // Тап во время игры: кнопка паузы в правом верхнем углу
        if (this.state === GAME_CONSTANTS.STATES.PLAYING) {
            if (x > this.canvas.width - 44 && y < 55) {
                this.state = GAME_CONSTANTS.STATES.PAUSED;
            }
        }
    }

    _onPauseKey() {
        if (this.state === GAME_CONSTANTS.STATES.PLAYING) {
            this.state = GAME_CONSTANTS.STATES.PAUSED;
        } else if (this.state === GAME_CONSTANTS.STATES.PAUSED) {
            this.state = GAME_CONSTANTS.STATES.PLAYING;
        }
    }

    // === НАЧАЛО ИГРЫ ===
    _startNewGame() {
        this.audio.init();
        this.level = 1;
        this.player = null;
        this._startLevel();
    }

    _continueGame() {
        this.audio.init();
        const save = this.storage.load();
        this.level = save ? save.level : 1;
        this.player = null;
        this._startLevel();
    }

    // === НАЧАЛО УРОВНЯ ===
    _startLevel() {
        const mazeSize = getMazeSizeForLevel(this.level);
        const generator = new MazeGenerator(mazeSize, mazeSize);
        const matrix = generator.generate();

        const populator = new MazePopulator(matrix, this.level);
        this.levelData = populator.populate();

        this.mazeWidth = this.levelData.matrix[0].length;
        this.mazeHeight = this.levelData.matrix.length;

        // Адаптивный размер клетки
        const maxCellW = (this.canvas.width - 20) / this.mazeWidth;
        const maxCellH = (this.canvas.height - 80) / this.mazeHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 60));

        this.renderer.setOffset(this.mazeWidth, this.mazeHeight, this.cellSize);

        if (!this.player) {
            this.player = new Player(this.levelData.startPos, this.cellSize);
        } else {
            this.player.resetForNewLevel(this.levelData.startPos, this.cellSize);
        }

        this.enemyManager.init(this.levelData.enemies, this.level, this.cellSize);
        this.powerUpManager.init(this.levelData.powers, this.cellSize);

        if (this.levelData.portal) {
            this.portal = new Portal(this.levelData.portal, this.cellSize);
        } else {
            this.portal = null;
        }

        this.movingWalls = this.levelData.movingWalls || [];
        this.crystals = this.levelData.crystals.map(c => ({ ...c, collected: false }));

        this.activePowerEffect = null;
        this.particles.clear();
        this.bufferedDir = null;

        this.lightning.init(
            this.level, this.levelData.matrix, this.cellSize,
            this.levelData.startPos, this.levelData.finishPos
        );

        this.crystalRunners.init(
            this.level, this.levelData.matrix, this.cellSize,
            this.levelData.startPos, this.levelData.finishPos, this.crystals
        );
        this.ghostWalls.init(
            this.level, this.levelData.matrix,
            this.levelData.startPos, this.levelData.finishPos, this.cellSize
        );
        this.lineLightning.init(this.level);
        this.magicFlowers.init(
            this.level, this.levelData.matrix, this.cellSize,
            this.levelData.startPos, this.levelData.finishPos
        );
        this.fogLevel.init(this.level, this.mazeWidth, this.mazeHeight, this.cellSize);
        if (this.fogLevel.active) this.audio.playFogAmbient && this.audio.playFogAmbient();

        this.crystalFever.init(this.level, this.levelData.matrix, this.cellSize);
        this.skinEffects.reset();

        this.state = GAME_CONSTANTS.STATES.LEVEL_INTRO;
        this.levelIntroTimer = 0;

        this.storage.updateLevel(this.level);
    }

    // ======================================================================
    // ОСНОВНОЙ ИГРОВОЙ ЦИКЛ
    // Без искусственного троттлинга: браузер сам ограничит до VSync.
    // deltaTime ограничен сверху 50 мс, чтобы движение не «прыгало» через стены.
    // ======================================================================
    gameLoop(currentTime) {
        const deltaTime = Math.min(currentTime - this.lastTime, 50);
        this.lastTime = currentTime;

        switch (this.state) {
            case GAME_CONSTANTS.STATES.MENU:
                this._updateMenu(deltaTime);
                this._renderMenu();
                break;
            case GAME_CONSTANTS.STATES.LEVEL_INTRO:
                this._updateLevelIntro(deltaTime);
                this._renderLevelIntro();
                break;
            case GAME_CONSTANTS.STATES.PLAYING:
                this._updatePlaying(deltaTime);
                this._renderPlaying();
                break;
            case GAME_CONSTANTS.STATES.PAUSED:
                this._updateMenu(deltaTime);
                this._renderPlaying();
                this.menu.renderPauseScreen();
                break;
            case GAME_CONSTANTS.STATES.BONUS_ROOM:
                this._updateBonusRoom(deltaTime);
                this._renderBonusRoom();
                break;
            case GAME_CONSTANTS.STATES.GAME_OVER:
                this._updateMenu(deltaTime);
                this._renderGameOver();
                break;
            case GAME_CONSTANTS.STATES.LEVEL_COMPLETE:
                this._updateLevelComplete(deltaTime);
                this._renderPlaying();
                break;
            case GAME_CONSTANTS.STATES.PORTAL_TRANSITION:
                this._updatePortalTransition(deltaTime);
                this._renderPlaying();
                break;
            case GAME_CONSTANTS.STATES.SHOP:
                this._updateShop(deltaTime);
                this._renderShop();
                break;
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // === ОБНОВЛЕНИЕ МЕНЮ ===
    _updateMenu(deltaTime) {
        this.menu.updateBackground(deltaTime);
        // Частицы в меню тоже обновляем, но в новом меню их минимум.
        this.particles.update(deltaTime);
    }

    _renderMenu() {
        const activeSkin = this.skinShop.getActiveSkin();
        this.menu.renderMainMenu(this.storage.hasSave(), this.skinShop.getCrystals(), activeSkin);
    }

    // === ОБНОВЛЕНИЕ НАЧАЛА УРОВНЯ ===
    _updateLevelIntro(deltaTime) {
        this.levelIntroTimer += deltaTime;
        if (this.levelIntroTimer >= this.levelIntroMaxTime) {
            this.state = GAME_CONSTANTS.STATES.PLAYING;
        }
    }

    _renderLevelIntro() {
        const progress = Math.min(this.levelIntroTimer / this.levelIntroMaxTime, 1);
        // Используем чистый светлый интро, гармонирующий с новым меню
        if (this.menu.renderLevelIntro) {
            this.menu.renderLevelIntro(this.level, progress);
        } else {
            this.renderer.drawLevelIntro(this.level, progress);
        }
    }

    // === ОБНОВЛЕНИЕ ИГРЫ ===
    _updatePlaying(deltaTime) {
        const time = performance.now();

        // Применяем буферизованный ход, как только лисёнок остановился.
        // Это даёт ощущение «непрерывного» движения при удержании пальца на свайпе.
        if (!this.player.isMoving && this.bufferedDir) {
            const dir = this.bufferedDir;
            this.bufferedDir = null;
            this._tryMove(dir);
        }

        this.player.update(deltaTime);
        this.enemyManager.update(deltaTime);
        this.powerUpManager.update(deltaTime);

        if (this.portal) this.portal.update(deltaTime);

        this._updateMovingWalls(deltaTime);
        this.particles.update(deltaTime);

        if (this.activePowerEffect) {
            this.activePowerEffect.update(
                deltaTime,
                this.renderer.offsetX + this.player.pixelX,
                this.renderer.offsetY + this.player.pixelY,
                this.cellSize
            );
            if (this.activePowerEffect.isExpired()) this.activePowerEffect = null;
        }

        this.renderer.updateWallBreath(deltaTime);

        // Эффекты скинов
        const activeSkin = this.skinShop.getActiveSkin();
        if (activeSkin) {
            this.skinEffects.update(deltaTime, this.player, activeSkin);
            if (this.player.isMoving) {
                this.skinSoundTimer += deltaTime;
                if (this.skinSoundTimer > 300) {
                    this.skinSoundTimer = 0;
                    this._playSkinMovementSound(activeSkin);
                }
            }
        }

        // Молния
        if (this.lightning.isActive()) {
            const prevState = this.lightning.getState();
            this.lightning.update(deltaTime, this.player.gridX, this.player.gridY);
            const newState = this.lightning.getState();

            if (prevState === 'idle' && newState === 'charging') {
                this.lightningChargeSound = this.audio.playLightningCharge();
            }

            if (prevState === 'charging' && newState === 'striking') {
                if (this.lightningChargeSound) {
                    this.lightningChargeSound.stop();
                    this.lightningChargeSound = null;
                }

                const isLine = this.lineLightning.shouldBeLineStrike();

                if (isLine && this.lightning.targetX >= 0) {
                    this.audio.playLineLightningStrike();
                    this.lineLightning.calculateLineTargets(
                        this.lightning.targetX, this.lightning.targetY,
                        this.lightning.lastDirection, this.levelData.matrix
                    );
                    this.lineLightning.generateLineBolt(this.cellSize, this.renderer.offsetX, this.renderer.offsetY);
                    this.lineLightning.generateLineSparks(this.cellSize);

                    if (this.lineLightning.checkHit(this.player.gridX, this.player.gridY)) {
                        const damaged = this.player.takeDamage(1);
                        if (damaged) this._handlePlayerHit();
                    }
                } else {
                    this.audio.playLightningStrike();
                    const strikeResult = this.lightning.checkStrike(
                        this.player.gridX, this.player.gridY,
                        this.enemyManager.enemies, this.crystals
                    );
                    if (strikeResult) {
                        if (strikeResult.hitPlayer) {
                            const damaged = this.player.takeDamage(1);
                            if (damaged) this._handlePlayerHit();
                        }
                        if (strikeResult.hitEnemy) strikeResult.hitEnemy.alive = false;
                        if (strikeResult.hitCrystal) strikeResult.hitCrystal.collected = true;
                    }
                }
            }
        }

        // Зевота при бездействии
        if (this.player.emotionState === 'idle' && this.player.emotionTimer > 1900) {
            this.audio.playEmotionIdle();
        }

        // Новые механики
        this.crystalRunners.update(deltaTime, this.player.gridX, this.player.gridY, this.levelData.matrix);
        this.ghostWalls.update(deltaTime, time, this.levelData.matrix, this.player);
        this.lineLightning.update(deltaTime);
        this.magicFlowers.update(deltaTime);

        const shadowSpawn = this.magicFlowers.checkShadowSpawn();
        if (shadowSpawn) {
            const newEnemy = new Enemy({
                startPos: shadowSpawn,
                patrolRoute: [shadowSpawn],
                isGuardian: false
            }, this.level, this.cellSize);
            this.enemyManager.enemies.push(newEnemy);
            this.audio.playFlowerWilt && this.audio.playFlowerWilt();
        }

        this.fogLevel.update(deltaTime, this.player.gridX, this.player.gridY);

        const prevFeverActive = this.crystalFever.active;
        this.crystalFever.update(deltaTime, this.player.gridX, this.player.gridY);
        if (!prevFeverActive && this.crystalFever.active) {
            this.audio.playCrystalFeverStart && this.audio.playCrystalFeverStart();
        }
        if (prevFeverActive && !this.crystalFever.active) {
            this.audio.playCrystalFeverEnd && this.audio.playCrystalFeverEnd();
            if (this.crystalFever.checkMegaCollect()) {
                this.particles.addTextPopup(
                    this.canvas.width / 2, this.canvas.height / 2 - 30,
                    'МЕГА-СБОР!', '#ffb74d', 28
                );
                this.particles.emitLevelComplete(this.canvas.width, this.canvas.height);
            }
        }

        // Столкновения проверяем только когда лисёнок «приземлился» на клетку
        if (!this.player.isMoving) {
            this._checkCollisions();
        }

        if (this.player.activePower === 'magnet') this._applyMagnetEffect();
    }

    // === ОБРАБОТКА ПОПАДАНИЯ ПО ИГРОКУ (вынесено для DRY) ===
    _handlePlayerHit() {
        this.audio.playDamage();
        this.player.triggerEmotion('scared', 1200);
        this.audio.playEmotionScared();
        this.particles.emitDamage(
            this.renderer.offsetX + this.player.pixelX + this.cellSize / 2,
            this.renderer.offsetY + this.player.pixelY + this.cellSize / 2
        );
        if (this.player.lives <= 0) {
            this.player.triggerEmotion('sad', 2000);
            this.audio.playEmotionSad();
            this._gameOver();
        }
    }

    // === ПРОВЕРКА СТОЛКНОВЕНИЙ ===
    _checkCollisions() {
        const px = this.player.gridX;
        const py = this.player.gridY;

        // Кристаллы
        for (const crystal of this.crystals) {
            if (!crystal.collected && crystal.x === px && crystal.y === py) {
                crystal.collected = true;
                this.player.addScore(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
                this.skinShop.addCrystals(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
                this.audio.playCrystalCollect();
                this.player.triggerEmotion('happy', 1000);
                this.audio.playEmotionHappy();
                this.skinEffects.onCrystalCollected();
                this.particles.emitCrystalCollect(
                    this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                    this.renderer.offsetY + py * this.cellSize + this.cellSize / 2
                );
                this.particles.addTextPopup(
                    this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                    this.renderer.offsetY + py * this.cellSize,
                    `+${GAME_CONSTANTS.SCORING.CRYSTAL_POINTS}`,
                    GAME_CONSTANTS.COLORS.UI_SCORE, 16
                );
            }
        }

        // Усиления
        const collectedPower = this.powerUpManager.checkCollection(px, py);
        if (collectedPower) {
            this.player.activatePower(collectedPower.type);
            this.audio.playPowerUp();
            this.player.triggerEmotion('surprised', 800);
            this.audio.playEmotionSurprised();
            this.particles.emitPowerCollect(
                this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                this.renderer.offsetY + py * this.cellSize + this.cellSize / 2,
                collectedPower.getColor()
            );
            this.particles.addTextPopup(
                this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                this.renderer.offsetY + py * this.cellSize - 10,
                collectedPower.getName(),
                collectedPower.getColor(), 18
            );
            this.activePowerEffect = new ActivePowerEffect(
                collectedPower.type, this.player.powerTimer
            );
            if (collectedPower.type === 'freeze') {
                this.enemyManager.freezeAll(GAME_CONSTANTS.POWERS.FREEZE_DURATION);
            }
        }

        // Паутина
        for (const web of (this.levelData.webs || [])) {
            if (web.x === px && web.y === py && !this.player.isSlowed) {
                this.player.applySlow();
                this.particles.addTextPopup(
                    this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                    this.renderer.offsetY + py * this.cellSize,
                    'Паутина!', GAME_CONSTANTS.COLORS.WEB_COLOR, 14
                );
            }
        }

        // Портал
        if (this.portal && this.portal.checkEntry(px, py)) {
            this.audio.playPortalEnter();
            this.particles.emitPortalEntry(
                this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                this.renderer.offsetY + py * this.cellSize + this.cellSize / 2
            );
            this.state = GAME_CONSTANTS.STATES.PORTAL_TRANSITION;
            this.portalTransitionTimer = 1000;
        }

        // Враги
        const hitEnemy = this.enemyManager.checkCollisions(
            this.player.pixelX, this.player.pixelY, this.cellSize
        );
        if (hitEnemy) {
            const damaged = this.player.takeDamage(hitEnemy.damage);
            if (damaged) this._handlePlayerHit();
        }

        // Финиш
        if (this.levelData.finishPos &&
            px === this.levelData.finishPos.x && py === this.levelData.finishPos.y) {
            this._levelComplete();
        }

        // Кристалл-непоседа
        const caughtRunner = this.crystalRunners.checkCollection(px, py);
        if (caughtRunner) {
            this.player.addScore(caughtRunner.points);
            this.skinShop.addCrystals(caughtRunner.points);
            this.audio.playCrystalRunnerCatch && this.audio.playCrystalRunnerCatch();
            this.player.triggerEmotion('celebrating', 1500);
            // Лёгкий фейерверк (укладывается в общий лимит частиц)
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const speed = 2 + Math.random() * 3;
                const color = i % 2 === 0 ? '#ffd54f' : '#f48fb1';
                this.particles._addParticle({
                    x: this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                    y: this.renderer.offsetY + py * this.cellSize + this.cellSize / 2,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: 700, maxLife: 700,
                    size: 3 + Math.random() * 3,
                    color, alpha: 1, gravity: 0.08, shrink: 0.97, type: 'star',
                    rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.2
                });
            }
            this.particles.addTextPopup(
                this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                this.renderer.offsetY + py * this.cellSize,
                `+${caughtRunner.points}`, '#ffb74d', 20
            );
        }

        // Волшебный цветок
        const flowerReward = this.magicFlowers.checkCollection(px, py);
        if (flowerReward) {
            this.audio.playFlowerCollect && this.audio.playFlowerCollect();
            this.player.triggerEmotion('happy', 1200);
            switch (flowerReward.type) {
                case 'crystals': {
                    const amount = flowerReward.amount * GAME_CONSTANTS.SCORING.CRYSTAL_POINTS;
                    this.player.addScore(amount);
                    this.skinShop.addCrystals(amount);
                    this.particles.addTextPopup(
                        this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                        this.renderer.offsetY + py * this.cellSize,
                        `+${amount}`, '#ffb74d', 18
                    );
                    break;
                }
                case 'power':
                    this.player.activatePower(flowerReward.power);
                    this.activePowerEffect = new ActivePowerEffect(flowerReward.power, this.player.powerTimer);
                    if (flowerReward.power === 'freeze') {
                        this.enemyManager.freezeAll(GAME_CONSTANTS.POWERS.FREEZE_DURATION);
                    }
                    break;
                case 'life':
                    this.player.lives = Math.min(this.player.lives + 1, GAME_CONSTANTS.PLAYER.LIVES);
                    this.particles.addTextPopup(
                        this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                        this.renderer.offsetY + py * this.cellSize,
                        '+1 ❤', '#ef9a9a', 20
                    );
                    break;
            }
        }

        // Кристальная лихорадка
        if (this.crystalFever.active && this.crystalFever.collectCrystal(px, py)) {
            this.player.addScore(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
            this.skinShop.addCrystals(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
            this.audio.playCrystalCollect();
            this.particles.emitCrystalCollect(
                this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                this.renderer.offsetY + py * this.cellSize + this.cellSize / 2
            );
        }
    }

    // === ЭФФЕКТ МАГНИТА ===
    _applyMagnetEffect() {
        const px = this.player.gridX;
        const py = this.player.gridY;
        const radius = GAME_CONSTANTS.POWERS.MAGNET_RADIUS;

        for (const crystal of this.crystals) {
            if (crystal.collected) continue;
            const dist = Math.abs(crystal.x - px) + Math.abs(crystal.y - py);
            if (dist <= radius * 2) {
                crystal.collected = true;
                this.player.addScore(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
                this.audio.playCrystalCollect();
                this.particles.emitCrystalCollect(
                    this.renderer.offsetX + crystal.x * this.cellSize + this.cellSize / 2,
                    this.renderer.offsetY + crystal.y * this.cellSize + this.cellSize / 2
                );
            }
        }
    }

    // === ДВИЖУЩИЕСЯ СТЕНЫ ===
    _updateMovingWalls(deltaTime) {
        for (const wall of this.movingWalls) {
            wall.timer += deltaTime;
            const cycle = GAME_CONSTANTS.OBSTACLES.MOVING_WALL_CYCLE;
            const phase = (wall.timer % cycle) / cycle;
            wall.isBlocking = phase < 0.5;
        }
    }

    // === ЗАВЕРШЕНИЕ УРОВНЯ ===
    _levelComplete() {
        this.player.startVictory();
        this.player.addScore(GAME_CONSTANTS.SCORING.LEVEL_BONUS * this.level);
        this.audio.playLevelComplete();
        this.player.triggerEmotion('celebrating', 2500);
        this.audio.playEmotionCelebrating();
        this.particles.emitLevelComplete(this.canvas.width, this.canvas.height);
        this.state = GAME_CONSTANTS.STATES.LEVEL_COMPLETE;
        this.levelCompleteTimer = 2500;
        this.storage.updateHighScore(this.player.score);

        if (this.fogLevel.active) this.fogLevel.startFadeOut();

        if (this.level % 10 === 0) {
            this.particles.addTextPopup(
                this.canvas.width / 2, this.canvas.height / 2 - 50,
                'НЕВЕРОЯТНО!', '#ffb74d', 32
            );
        }
    }

    _updateLevelComplete(deltaTime) {
        this.player.update(deltaTime);
        this.particles.update(deltaTime);
        this.levelCompleteTimer -= deltaTime;
        if (this.levelCompleteTimer <= 0) {
            this.level++;
            this._startLevel();
        }
    }

    // === ПОРТАЛЬНЫЙ ПЕРЕХОД ===
    _updatePortalTransition(deltaTime) {
        this.particles.update(deltaTime);
        this.portalTransitionTimer -= deltaTime;
        if (this.portalTransitionTimer <= 0) {
            const returnPos = { x: this.player.gridX, y: this.player.gridY };
            const roomData = this.bonusRoom.activate(returnPos);
            const roomMatSize = roomData.size;
            const roomCellSize = Math.floor(Math.min(
                (this.canvas.width - 20) / roomMatSize,
                (this.canvas.height - 80) / roomMatSize, 60
            ));
            this.renderer.setOffset(roomMatSize, roomMatSize, roomCellSize);
            this.player.resetForNewLevel(roomData.startPos, roomCellSize);
            this.cellSize = roomCellSize;
            this.state = GAME_CONSTANTS.STATES.BONUS_ROOM;
            this.audio.playBonusRoomMelody();
        }
    }

    // === БОНУС-КОМНАТА ===
    _updateBonusRoom(deltaTime) {
        // Применяем буферизованное направление
        if (!this.player.isMoving && this.bufferedDir) {
            const dir = this.bufferedDir;
            this.bufferedDir = null;
            this._tryMove(dir);
        }
        this.player.update(deltaTime);
        this.bonusRoom.update(deltaTime);
        this.particles.update(deltaTime);

        if (!this.player.isMoving) {
            const px = this.player.gridX;
            const py = this.player.gridY;

            if (this.bonusRoom.collectCrystal(px, py)) {
                this.player.addScore(GAME_CONSTANTS.SCORING.BONUS_ROOM_CRYSTAL);
                this.skinShop.addCrystals(GAME_CONSTANTS.SCORING.BONUS_ROOM_CRYSTAL);
                this.audio.playCrystalCollect();
                this.particles.emitCrystalCollect(
                    this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                    this.renderer.offsetY + py * this.cellSize + this.cellSize / 2
                );
            }

            const powerType = this.bonusRoom.collectPower(px, py);
            if (powerType) {
                this.player.activatePower(powerType);
                this.audio.playPowerUp();
            }
        }

        if (this.bonusRoom.isExitReady()) this._exitBonusRoom();
    }

    _exitBonusRoom() {
        this.bonusRoom.deactivate();
        const returnPos = this.bonusRoom.returnPos;
        const maxCellW = (this.canvas.width - 20) / this.mazeWidth;
        const maxCellH = (this.canvas.height - 80) / this.mazeHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 60));
        this.renderer.setOffset(this.mazeWidth, this.mazeHeight, this.cellSize);
        this.player.resetForNewLevel(returnPos, this.cellSize);
        this.state = GAME_CONSTANTS.STATES.PLAYING;
    }

    _renderBonusRoom() {
        this.renderer.clear();
        this.renderer.drawBonusRoom(this.bonusRoom, this.player, performance.now());
        this.renderer.drawMaze(this.bonusRoom.matrix);
        const uncollected = this.bonusRoom.crystals.filter(c => !c.collected);
        this.renderer.drawCrystals(uncollected, performance.now());
        if (this.bonusRoom.power && !this.bonusRoom.power.collected) {
            const tempPower = new PowerUp(this.bonusRoom.power, this.cellSize);
            tempPower.update(0);
            this.renderer.drawPowerUps([tempPower]);
        }
        this.renderer.drawPlayer(this.player);
        this.renderer.drawParticles(this.particles);
    }

    // === КОНЕЦ ИГРЫ ===
    _gameOver() {
        this.state = GAME_CONSTANTS.STATES.GAME_OVER;
        this.storage.updateHighScore(this.player.score);
    }

    _renderGameOver() {
        const activeSkin = this.skinShop.getActiveSkin();
        this.menu.renderGameOver(
            this.player.score, this.level,
            this.storage.getHighScore(), activeSkin
        );
    }

    // === РЕНДЕР ИГРОВОГО ПРОЦЕССА ===
    _renderPlaying() {
        const time = performance.now();
        const shake = this.lightning.getShakeOffset();
        if (shake.x !== 0 || shake.y !== 0) {
            this.ctx.save();
            this.ctx.translate(shake.x, shake.y);
        }

        this.renderer.clear();
        this.renderer.drawMaze(this.levelData.matrix);

        const uncollected = this.crystals.filter(c => !c.collected);
        this.renderer.drawCrystals(uncollected, time);

        if (this.levelData.webs && this.levelData.webs.length > 0) {
            this.renderer.drawWebs(this.levelData.webs);
        }
        if (this.movingWalls.length > 0) {
            this.renderer.drawMovingWalls(this.movingWalls);
        }
        if (this.portal) this.renderer.drawPortal(this.portal);
        this.renderer.drawFinishStar(this.levelData.finishPos, time);
        this.renderer.drawPowerUps(this.powerUpManager.getActive());

        this.ghostWalls.render(this.ctx, this.renderer.offsetX, this.renderer.offsetY, time);
        this.crystalRunners.render(this.ctx, this.renderer.offsetX, this.renderer.offsetY, time);
        this.magicFlowers.render(this.ctx, this.renderer.offsetX, this.renderer.offsetY, time);
        this.crystalFever.render(this.ctx, this.renderer.offsetX, this.renderer.offsetY, time, this.canvas.width, this.canvas.height);

        this.renderer.drawEnemies(this.enemyManager.enemies);

        if (this.activePowerEffect) this.renderer.drawActivePowerEffect(this.activePowerEffect);

        const activeSkin = this.skinShop.getActiveSkin();
        if (activeSkin) {
            this.renderer.drawSkinEffects(this.player, activeSkin, time, this.skinEffects);
        }
        this.renderer.drawPlayer(this.player, activeSkin, this.skinEffects);
        this.renderer.drawParticles(this.particles);

        this.renderer.drawUI(
            this.player.lives, this.player.score, this.level,
            this.player.activePower, this.player.powerTimer,
            this._getMaxPowerDuration(this.player.activePower), time
        );

        this.fogLevel.render(this.ctx, this.renderer.offsetX, this.renderer.offsetY, this.levelData.matrix);

        // Кнопка паузы (минималистичная — скруглённый квадратик с двумя полосками)
        this.renderer.drawPauseButton(this.canvas.width - 22, 27, 14);

        if (shake.x !== 0 || shake.y !== 0) this.ctx.restore();

        this.renderer.drawLightning(this.lightning);

        if (this.lineLightning.isLineStrike) {
            if (this.lightning.isCharging() && this.lineLightning.lineTargets.length > 0) {
                const progress = this.lightning.chargeTimer / this.lightning.chargeMaxTime;
                this.lineLightning.renderCharging(
                    this.ctx, this.renderer.offsetX, this.renderer.offsetY,
                    this.cellSize, progress, this.lightning.pulsePhase
                );
            }
            this.lineLightning.renderBolt(this.ctx, this.renderer.offsetX, this.renderer.offsetY);
            this.lineLightning.renderSparks(this.ctx, this.renderer.offsetX, this.renderer.offsetY);
        }
    }

    // === МАГАЗИН ===
    _updateShop(deltaTime) {
        this.menu.updateBackground(deltaTime);
        if (this.skinShop.purchaseAnimation) {
            this.skinShop.updatePurchaseAnimation(deltaTime);
        }
    }

    _renderShop() {
        const time = performance.now();
        this.menu.renderShop(this.skinShop, time);
    }

    // === Звуки скинов при движении ===
    _playSkinMovementSound(skin) {
        if (!skin) return;
        switch (skin.tier) {
            case 2: this.audio.playSkinMagicRustle(); break;
            case 3:
                if (skin.effect === 'fire') this.audio.playSkinFireCrackle();
                else this.audio.playSkinIceChime();
                break;
            case 4: this.audio.playSkinAmbient(); break;
            case 5:
                if (skin.effect === 'shadow_king') this.audio.playSkinShadowPulse();
                else this.audio.playSkinStarChime();
                break;
        }
    }

    _getMaxPowerDuration(type) {
        switch (type) {
            case 'dash': return GAME_CONSTANTS.POWERS.DASH_DURATION;
            case 'shield': return GAME_CONSTANTS.POWERS.SHIELD_DURATION;
            case 'magnet': return GAME_CONSTANTS.POWERS.MAGNET_DURATION;
            case 'freeze': return GAME_CONSTANTS.POWERS.FREEZE_DURATION;
            default: return 1;
        }
    }
}

// === ЗАПУСК ИГРЫ ===
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
