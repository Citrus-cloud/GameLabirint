// Файл: magic-maze/js/main.js
// Инициализация, основной игровой цикл, управление состояниями

class Game {
    constructor() {
        // Canvas
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
        this.skinShop = new SkinShop(); // Улучшение 1: Волшебный гардероб

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
        this.congratsTimer = 0;

        // Движущиеся стены
        this.movingWalls = [];

        // Управление
        this.inputQueue = [];
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30;

        // Привязка событий
        this._bindEvents();

        // Запуск цикла
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // Адаптивный размер Canvas
    resizeCanvas() {
        const maxW = Math.min(500, window.innerWidth);
        const maxH = Math.min(700, window.innerHeight);
        this.canvas.width = maxW;
        this.canvas.height = maxH;
        if (this.renderer) {
            this.renderer.width = maxW;
            this.renderer.height = maxH;
        }
    }

    // === ПРИВЯЗКА СОБЫТИЙ ===
    _bindEvents() {
        // Клавиши
        window.addEventListener('keydown', (e) => this._handleKey(e));

        // Тач
        this.canvas.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: false });

        // Клик (для меню и паузы)
        this.canvas.addEventListener('click', (e) => this._handleClick(e));

        // Ресайз
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    _handleKey(e) {
        if (this.state === GAME_CONSTANTS.STATES.PAUSED) {
            this.state = GAME_CONSTANTS.STATES.PLAYING;
            return;
        }

        if (this.state !== GAME_CONSTANTS.STATES.PLAYING && 
            this.state !== GAME_CONSTANTS.STATES.BONUS_ROOM) return;

        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                this.inputQueue.push('up'); break;
            case 'ArrowDown': case 's': case 'S':
                this.inputQueue.push('down'); break;
            case 'ArrowLeft': case 'a': case 'A':
                this.inputQueue.push('left'); break;
            case 'ArrowRight': case 'd': case 'D':
                this.inputQueue.push('right'); break;
            case 'Escape': case 'p': case 'P':
                if (this.state === GAME_CONSTANTS.STATES.PLAYING) {
                    this.state = GAME_CONSTANTS.STATES.PAUSED;
                }
                break;
        }
    }

    _handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    _handleTouchEnd(e) {
        e.preventDefault();
        if (e.changedTouches.length === 0) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.swipeThreshold) {
            // Это тап, не свайп
            this._handleTap(touch.clientX, touch.clientY);
            return;
        }

        if (this.state !== GAME_CONSTANTS.STATES.PLAYING && 
            this.state !== GAME_CONSTANTS.STATES.BONUS_ROOM) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.inputQueue.push(dx > 0 ? 'right' : 'left');
        } else {
            this.inputQueue.push(dy > 0 ? 'down' : 'up');
        }
    }

    _handleTap(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        if (this.state === GAME_CONSTANTS.STATES.PAUSED) {
            // Улучшение 1: иконка гардероба в паузе (левый верхний угол)
            if (x < 50 && y < 55) {
                this._shopReturnState = GAME_CONSTANTS.STATES.PAUSED;
                this.state = GAME_CONSTANTS.STATES.SHOP;
                this.skinShop.open();
                return;
            }
            this.state = GAME_CONSTANTS.STATES.PLAYING;
            return;
        }

        if (this.state === GAME_CONSTANTS.STATES.MENU) {
            // Проверяем нажатие кнопки "Играть"
            if (this._isButtonPressed(x, y, this.canvas.width / 2, 430, 160, 50)) {
                this._startNewGame();
            }
            // Кнопка "Продолжить"
            if (this.storage.hasSave() && this._isButtonPressed(x, y, this.canvas.width / 2, 500, 160, 50)) {
                this._continueGame();
            }
            // Улучшение 1: Кнопка "Гардероб"
            if (this._isButtonPressed(x, y, this.canvas.width / 2, 570, 160, 50)) {
                this._shopReturnState = GAME_CONSTANTS.STATES.MENU;
                this.state = GAME_CONSTANTS.STATES.SHOP;
                this.skinShop.open();
            }
            return;
        }

        if (this.state === GAME_CONSTANTS.STATES.GAME_OVER) {
            if (this._isButtonPressed(x, y, this.canvas.width / 2, 510, 160, 50)) {
                this._startNewGame();
            }
            return;
        }

        // Улучшение 1: обработка кликов в магазине
        if (this.state === GAME_CONSTANTS.STATES.SHOP) {
            const result = this.skinShop.handleClick(x, y, this.canvas.width, this.canvas.height);
            if (result === 'close') {
                this.skinShop.close();
                // Возвращаемся в предыдущее состояние
                this.state = this._shopReturnState || GAME_CONSTANTS.STATES.MENU;
            }
            return;
        }

        // Пауза: кнопка в правом верхнем углу
        if (this.state === GAME_CONSTANTS.STATES.PLAYING) {
            if (x > this.canvas.width - 40 && y < 55) {
                this.state = GAME_CONSTANTS.STATES.PAUSED;
            }
        }
    }

    _handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this._handleTap(e.clientX, e.clientY);
    }

    _isButtonPressed(x, y, bx, by, bw, bh) {
        return x >= bx - bw / 2 && x <= bx + bw / 2 && y >= by - bh / 2 && y <= by + bh / 2;
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

        // Размещение объектов
        const populator = new MazePopulator(matrix, this.level);
        this.levelData = populator.populate();

        // Размеры
        this.mazeWidth = this.levelData.matrix[0].length;
        this.mazeHeight = this.levelData.matrix.length;

        // Адаптивный размер клетки
        const maxCellW = (this.canvas.width - 20) / this.mazeWidth;
        const maxCellH = (this.canvas.height - 80) / this.mazeHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 60));

        this.renderer.setOffset(this.mazeWidth, this.mazeHeight, this.cellSize);

        // Игрок
        if (!this.player) {
            this.player = new Player(this.levelData.startPos, this.cellSize);
        } else {
            this.player.resetForNewLevel(this.levelData.startPos, this.cellSize);
        }

        // Враги
        this.enemyManager.init(this.levelData.enemies, this.level, this.cellSize);

        // Усиления
        this.powerUpManager.init(this.levelData.powers, this.cellSize);

        // Портал
        if (this.levelData.portal) {
            this.portal = new Portal(this.levelData.portal, this.cellSize);
        } else {
            this.portal = null;
        }

        // Движущиеся стены
        this.movingWalls = this.levelData.movingWalls || [];

        // Кристаллы как объекты с collected
        this.crystals = this.levelData.crystals.map(c => ({ ...c, collected: false }));

        // Сброс
        this.activePowerEffect = null;
        this.particles.clear();
        this.inputQueue = [];

        // Показать анимацию начала уровня
        this.state = GAME_CONSTANTS.STATES.LEVEL_INTRO;
        this.levelIntroTimer = 0;

        // Сохранить прогресс
        this.storage.updateLevel(this.level);
    }



    // === ОСНОВНОЙ ИГРОВОЙ ЦИКЛ ===
    gameLoop(currentTime) {
        const deltaTime = Math.min(currentTime - this.lastTime, 50); // Ограничиваем дельту
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
                this._renderPlaying();
                this.renderer.drawPauseScreen();
                break;
            case GAME_CONSTANTS.STATES.BONUS_ROOM:
                this._updateBonusRoom(deltaTime);
                this._renderBonusRoom();
                break;
            case GAME_CONSTANTS.STATES.GAME_OVER:
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
            // Улучшение 1: экран Волшебного Гардероба
            case GAME_CONSTANTS.STATES.SHOP:
                this._updateShop(deltaTime);
                this._renderShop();
                break;
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // === ОБНОВЛЕНИЕ МЕНЮ ===
    _updateMenu(deltaTime) {
        this.particles.update(deltaTime);
    }

    _renderMenu() {
        this.renderer.drawMenuScreen(this.storage.hasSave(), performance.now(), this.skinShop.getCrystals());
        this.renderer.drawParticles(this.particles);
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
        this.renderer.drawLevelIntro(this.level, progress);
    }

    // === ОБНОВЛЕНИЕ ИГРЫ ===
    _updatePlaying(deltaTime) {
        const time = performance.now();

        // Обработка ввода
        this._processInput();

        // Обновление игрока
        this.player.update(deltaTime);

        // Обновление врагов
        this.enemyManager.update(deltaTime);

        // Обновление усилений
        this.powerUpManager.update(deltaTime);

        // Обновление портала
        if (this.portal) {
            this.portal.update(deltaTime);
        }

        // Обновление движущихся стен
        this._updateMovingWalls(deltaTime);

        // Обновление частиц
        this.particles.update(deltaTime);

        // Обновление эффекта усиления
        if (this.activePowerEffect) {
            this.activePowerEffect.update(
                deltaTime,
                this.renderer.offsetX + this.player.pixelX,
                this.renderer.offsetY + this.player.pixelY,
                this.cellSize
            );
            if (this.activePowerEffect.isExpired()) {
                this.activePowerEffect = null;
            }
        }

        // Обновление дыхания стен
        this.renderer.updateWallBreath(deltaTime);

        // Улучшение 3: звук зевоты при бездействии
        if (this.player.emotionState === 'idle' && this.player.emotionTimer > 1900) {
            this.audio.playEmotionIdle();
        }

        // Проверка столкновений (только когда не двигается)
        if (!this.player.isMoving) {
            this._checkCollisions();
        }

        // Эффект магнита
        if (this.player.activePower === 'magnet') {
            this._applyMagnetEffect();
        }
    }

    // === ОБРАБОТКА ВВОДА ===
    _processInput() {
        if (this.player.isMoving || this.inputQueue.length === 0) return;

        const direction = this.inputQueue.shift();
        // Улучшение 3: сброс таймера бездействия при вводе
        this.player.resetIdleTimer();
        let dx = 0, dy = 0;

        switch (direction) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
        }

        const newX = this.player.gridX + dx;
        const newY = this.player.gridY + dy;

        // Проверка границ и стен
        const matrix = this.state === GAME_CONSTANTS.STATES.BONUS_ROOM ? 
            this.bonusRoom.matrix : this.levelData.matrix;

        if (newX >= 0 && newX < matrix[0].length &&
            newY >= 0 && newY < matrix.length &&
            matrix[newY][newX] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
            
            // Проверка движущейся стены
            const blockedByWall = this.movingWalls.some(w => 
                w.isBlocking && w.pos.x === newX && w.pos.y === newY
            );

            if (!blockedByWall) {
                this.player.moveTo(newX, newY);
                this.audio.playMove();
            }
        }
    }

    // === ПРОВЕРКА СТОЛКНОВЕНИЙ ===
    _checkCollisions() {
        const px = this.player.gridX;
        const py = this.player.gridY;

        // Сбор кристаллов
        for (const crystal of this.crystals) {
            if (!crystal.collected && crystal.x === px && crystal.y === py) {
                crystal.collected = true;
                this.player.addScore(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
                // Улучшение 1: добавляем кристаллы в баланс магазина
                this.skinShop.addCrystals(GAME_CONSTANTS.SCORING.CRYSTAL_POINTS);
                this.audio.playCrystalCollect();
                // Улучшение 3: эмоция радости
                this.player.triggerEmotion('happy', 1000);
                this.audio.playEmotionHappy();
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

        // Сбор усилений
        const collectedPower = this.powerUpManager.checkCollection(px, py);
        if (collectedPower) {
            this.player.activatePower(collectedPower.type);
            this.audio.playPowerUp();
            // Улучшение 3: эмоция удивления
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

            // Создаём визуальный эффект
            this.activePowerEffect = new ActivePowerEffect(
                collectedPower.type, 
                this.player.powerTimer
            );

            // Если заморозка — замораживаем врагов
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

        // Столкновение с врагами
        const hitEnemy = this.enemyManager.checkCollisions(
            this.player.pixelX, this.player.pixelY, this.cellSize
        );
        if (hitEnemy) {
            const damaged = this.player.takeDamage(hitEnemy.damage);
            if (damaged) {
                this.audio.playDamage();
                // Улучшение 3: эмоция испуга
                this.player.triggerEmotion('scared', 1200);
                this.audio.playEmotionScared();
                this.particles.emitDamage(
                    this.renderer.offsetX + this.player.pixelX + this.cellSize / 2,
                    this.renderer.offsetY + this.player.pixelY + this.cellSize / 2
                );

                if (this.player.lives <= 0) {
                    // Улучшение 3: эмоция грусти при проигрыше
                    this.player.triggerEmotion('sad', 2000);
                    this.audio.playEmotionSad();
                    this._gameOver();
                }
            }
        }

        // Финишная звезда
        if (this.levelData.finishPos &&
            px === this.levelData.finishPos.x && py === this.levelData.finishPos.y) {
            this._levelComplete();
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
                // Притягиваем кристалл
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
        // Улучшение 3: эмоция бурной радости
        this.player.triggerEmotion('celebrating', 2500);
        this.audio.playEmotionCelebrating();
        this.particles.emitLevelComplete(this.canvas.width, this.canvas.height);
        this.state = GAME_CONSTANTS.STATES.LEVEL_COMPLETE;
        this.levelCompleteTimer = 2500;
        this.storage.updateHighScore(this.player.score);

        // Мини-поздравление каждые 10 уровней
        if (this.level % 10 === 0) {
            this.particles.addTextPopup(
                this.canvas.width / 2, this.canvas.height / 2 - 50,
                'НЕВЕРОЯТНО!', '#ffd700', 32
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
            // Входим в бонус-комнату
            const returnPos = { x: this.player.gridX, y: this.player.gridY };
            const roomData = this.bonusRoom.activate(returnPos);

            // Перенастраиваем размер
            const roomMatSize = roomData.size;
            const roomCellSize = Math.floor(Math.min(
                (this.canvas.width - 20) / roomMatSize,
                (this.canvas.height - 80) / roomMatSize,
                60
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
        this._processInput();
        this.player.update(deltaTime);
        this.bonusRoom.update(deltaTime);
        this.particles.update(deltaTime);

        if (!this.player.isMoving) {
            const px = this.player.gridX;
            const py = this.player.gridY;

            // Сбор кристаллов
            if (this.bonusRoom.collectCrystal(px, py)) {
                this.player.addScore(GAME_CONSTANTS.SCORING.BONUS_ROOM_CRYSTAL);
                // Улучшение 1: добавляем кристаллы в баланс магазина
                this.skinShop.addCrystals(GAME_CONSTANTS.SCORING.BONUS_ROOM_CRYSTAL);
                this.audio.playCrystalCollect();
                this.particles.emitCrystalCollect(
                    this.renderer.offsetX + px * this.cellSize + this.cellSize / 2,
                    this.renderer.offsetY + py * this.cellSize + this.cellSize / 2
                );
            }

            // Сбор усиления
            const powerType = this.bonusRoom.collectPower(px, py);
            if (powerType) {
                this.player.activatePower(powerType);
                this.audio.playPowerUp();
            }
        }

        // Выход из бонус-комнаты
        if (this.bonusRoom.isExitReady()) {
            this._exitBonusRoom();
        }
    }

    _exitBonusRoom() {
        this.bonusRoom.deactivate();

        // Возвращаемся в основной лабиринт
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

        // Кристаллы бонус-комнаты
        const uncollected = this.bonusRoom.crystals.filter(c => !c.collected);
        this.renderer.drawCrystals(uncollected, performance.now());

        // Усиление в бонус-комнате
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
        this.renderer.drawGameOverScreen(
            this.player.score,
            this.level,
            this.storage.getHighScore()
        );
    }

    // === РЕНДЕР ИГРОВОГО ПРОЦЕССА ===
    _renderPlaying() {
        const time = performance.now();

        this.renderer.clear();
        this.renderer.drawMaze(this.levelData.matrix);

        // Кристаллы
        const uncollected = this.crystals.filter(c => !c.collected);
        this.renderer.drawCrystals(uncollected, time);

        // Паутина
        if (this.levelData.webs && this.levelData.webs.length > 0) {
            this.renderer.drawWebs(this.levelData.webs);
        }

        // Движущиеся стены
        if (this.movingWalls.length > 0) {
            this.renderer.drawMovingWalls(this.movingWalls);
        }

        // Портал
        if (this.portal) {
            this.renderer.drawPortal(this.portal);
        }

        // Финишная звезда
        this.renderer.drawFinishStar(this.levelData.finishPos, time);

        // Усиления
        this.renderer.drawPowerUps(this.powerUpManager.getActive());

        // Враги
        this.renderer.drawEnemies(this.enemyManager.enemies);

        // Эффект активного усиления
        if (this.activePowerEffect) {
            this.renderer.drawActivePowerEffect(this.activePowerEffect);
        }

        // Игрок
        const activeSkin = this.skinShop.getActiveSkin();
        this.renderer.drawPlayer(this.player, activeSkin);

        // Улучшение 1: эффекты активного скина
        if (activeSkin) {
            this.renderer.drawSkinEffects(this.player, activeSkin, time);
        }

        // Частицы (поверх всего)
        this.renderer.drawParticles(this.particles);

        // UI
        this.renderer.drawUI(
            this.player.lives,
            this.player.score,
            this.level,
            this.player.activePower,
            this.player.powerTimer,
            this._getMaxPowerDuration(this.player.activePower),
            time
        );

        // Кнопка паузы
        this.renderer.drawPauseButton(this.canvas.width - 22, 27, 14);
    }

    // === Улучшение 1: ОБНОВЛЕНИЕ И РЕНДЕР МАГАЗИНА ===
    _updateShop(deltaTime) {
        // Обновление анимации покупки
        if (this.skinShop.purchaseAnimation) {
            this.skinShop.updatePurchaseAnimation(deltaTime);
        }
    }

    _renderShop() {
        const time = performance.now();
        this.renderer.drawShopScreen(this.skinShop, time);
        
        // Анимация покупки (поверх всего)
        if (this.skinShop.purchaseAnimation) {
            this.renderer.drawPurchaseAnimation(this.skinShop, time);
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
    const game = new Game();
});
