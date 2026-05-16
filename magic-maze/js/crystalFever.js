// Файл: magic-maze/js/crystalFever.js
// МЕХАНИКА 6: Кристальная лихорадка — особый режим с массой кристаллов
// Вероятность 1/12 на любом уровне начиная с 2-го, длится 20 секунд

class CrystalFeverSystem {
    constructor() {
        this.active = false;        // Лихорадка идёт
        this.announced = false;     // Анонс показан
        this.triggered = false;     // Уже было на этом уровне

        // Таймеры
        this.triggerDelay = 0;      // Задержка до запуска (10-20с после старта)
        this.announceTimer = 0;     // Время показа анонса (2с)
        this.feverTimer = 0;        // Оставшееся время лихорадки (20с)
        this.maxFeverTime = 20000;

        // Кристаллы лихорадки
        this.feverCrystals = [];    // [{x, y, collected, fadeTimer, color, blinkTime}]
        this.collectedCount = 0;
        this.totalSpawned = 0;

        // Визуальные эффекты
        this.announceScale = 0;
        this.announceAlpha = 0;
        this.announceSparkles = [];
        this.endParticles = [];     // Частицы при окончании
        this.megaCollectShown = false;

        // Параметры уровня
        this.level = 1;
        this.cellSize = 0;
        this.matrix = null;
        this.playerGridX = 0;
        this.playerGridY = 0;
    }

    // Инициализация для уровня
    init(level, matrix, cellSize) {
        this.level = level;
        this.matrix = matrix;
        this.cellSize = cellSize;
        this.active = false;
        this.announced = false;
        this.triggered = false;
        this.feverCrystals = [];
        this.collectedCount = 0;
        this.totalSpawned = 0;
        this.endParticles = [];
        this.megaCollectShown = false;
        this.announceSparkles = [];

        // Проверяем: будет ли лихорадка на этом уровне (1/12, с уровня 2)
        if (level >= 2 && Math.random() < 1 / 12) {
            this.triggered = true;
            // Задержка 10-20 секунд после старта уровня
            this.triggerDelay = 10000 + Math.random() * 10000;
        }
    }

    // Обновление каждый кадр
    update(deltaTime, playerGridX, playerGridY) {
        this.playerGridX = playerGridX;
        this.playerGridY = playerGridY;

        // Ожидание запуска
        if (this.triggered && !this.active && !this.announced) {
            this.triggerDelay -= deltaTime;
            if (this.triggerDelay <= 0) {
                this._startAnnounce();
            }
            return;
        }

        // Анонс (2 секунды)
        if (this.announced && !this.active) {
            this.announceTimer -= deltaTime;
            this.announceScale = Math.min(1.2, this.announceScale + deltaTime * 0.005);
            this.announceAlpha = Math.min(1, this.announceAlpha + deltaTime * 0.003);

            // Блёстки анонса
            if (Math.random() < 0.4) {
                this.announceSparkles.push({
                    x: (Math.random() - 0.5) * 300,
                    y: (Math.random() - 0.5) * 100,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -1 - Math.random() * 2,
                    life: 600,
                    maxLife: 600,
                    size: 2 + Math.random() * 4,
                    color: ['#ffd700', '#ff69b4', '#87ceeb', '#ffffff'][Math.floor(Math.random() * 4)]
                });
            }

            // Обновление блёсток
            for (let i = this.announceSparkles.length - 1; i >= 0; i--) {
                const s = this.announceSparkles[i];
                s.life -= deltaTime;
                s.x += s.vx;
                s.y += s.vy;
                if (s.life <= 0) this.announceSparkles.splice(i, 1);
            }

            if (this.announceTimer <= 0) {
                this._startFever();
            }
            return;
        }

        // Лихорадка активна
        if (this.active) {
            this.feverTimer -= deltaTime;

            // Обновление кристаллов (мигание и исчезновение)
            for (const crystal of this.feverCrystals) {
                if (crystal.collected) continue;

                crystal.blinkTime -= deltaTime;
                if (crystal.blinkTime <= 0) {
                    crystal.collected = true; // Исчезает
                    // Частица исчезновения
                    this.endParticles.push({
                        x: crystal.x * this.cellSize + this.cellSize / 2,
                        y: crystal.y * this.cellSize + this.cellSize / 2,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -1 - Math.random(),
                        life: 400,
                        maxLife: 400,
                        size: 3,
                        color: crystal.color
                    });
                }

                // Пульсация перед исчезновением (последние 30%)
                crystal.pulseAlpha = crystal.blinkTime < crystal.maxBlinkTime * 0.3 ?
                    Math.sin(performance.now() * 0.02) * 0.5 + 0.5 : 1;
            }

            // Окончание лихорадки
            if (this.feverTimer <= 0) {
                this._endFever();
            }

            // Обновление частиц окончания
            for (let i = this.endParticles.length - 1; i >= 0; i--) {
                const p = this.endParticles[i];
                p.life -= deltaTime;
                p.x += p.vx * (deltaTime / 16);
                p.y += p.vy * (deltaTime / 16);
                p.vy += 0.05;
                if (p.life <= 0) this.endParticles.splice(i, 1);
            }
        }
    }

    // Начать анонс
    _startAnnounce() {
        this.announced = true;
        this.announceTimer = 2000;
        this.announceScale = 0;
        this.announceAlpha = 0;
    }

    // Начать лихорадку
    _startFever() {
        this.active = true;
        this.feverTimer = this.maxFeverTime;
        this.collectedCount = 0;
        this._spawnFeverCrystals();
    }

    // Появление кристаллов в радиусе 7 от лисёнка
    _spawnFeverCrystals() {
        if (!this.matrix) return;

        const radius = 7;
        const colors = ['#ff69b4', '#4fc3f7', '#ffd700', '#69f0ae', '#ba68c8', '#ff8a65'];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;

                const x = this.playerGridX + dx;
                const y = this.playerGridY + dy;

                if (x < 0 || y < 0 || y >= this.matrix.length || x >= this.matrix[0].length) continue;
                if (this.matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.WALL) continue;

                // Не ставим на позицию игрока
                if (x === this.playerGridX && y === this.playerGridY) continue;

                // Случайное время существования (0.3 - 1.5с... от начала + случайный старт)
                const blinkTime = 300 + Math.random() * 1200 + Math.random() * this.maxFeverTime * 0.7;

                this.feverCrystals.push({
                    x: x,
                    y: y,
                    collected: false,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    blinkTime: Math.min(blinkTime, this.maxFeverTime - 500),
                    maxBlinkTime: blinkTime,
                    pulseAlpha: 1,
                    floatPhase: Math.random() * Math.PI * 2
                });
                this.totalSpawned++;
            }
        }
    }

    // Окончание лихорадки
    _endFever() {
        this.active = false;

        // Все оставшиеся кристаллы исчезают с эффектом
        for (const crystal of this.feverCrystals) {
            if (!crystal.collected) {
                crystal.collected = true;
                // Вспышка
                this.endParticles.push({
                    x: crystal.x * this.cellSize + this.cellSize / 2,
                    y: crystal.y * this.cellSize + this.cellSize / 2,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -2 - Math.random() * 3,
                    life: 800,
                    maxLife: 800,
                    size: 3 + Math.random() * 3,
                    color: '#ffd700'
                });
            }
        }

        // Проверка МЕГА-СБОР (40+ кристаллов)
        if (this.collectedCount >= 40) {
            this.megaCollectShown = true;
        }
    }

    // Сбор кристалла лихорадки
    collectCrystal(playerGridX, playerGridY) {
        if (!this.active) return false;

        for (const crystal of this.feverCrystals) {
            if (!crystal.collected && crystal.x === playerGridX && crystal.y === playerGridY) {
                crystal.collected = true;
                this.collectedCount++;
                return true;
            }
        }
        return false;
    }

    // Проверка: показать ли МЕГА-СБОР
    checkMegaCollect() {
        if (this.megaCollectShown) {
            this.megaCollectShown = false;
            return true;
        }
        return false;
    }

    // Получить прогресс таймера (0-1)
    getProgress() {
        if (!this.active) return 0;
        return this.feverTimer / this.maxFeverTime;
    }

    // Отрисовка
    render(ctx, offsetX, offsetY, time, canvasWidth, canvasHeight) {
        // Анонс
        if (this.announced && !this.active) {
            this._renderAnnounce(ctx, canvasWidth, canvasHeight, time);
            return;
        }

        // Кристаллы лихорадки
        if (this.active || this.endParticles.length > 0) {
            this._renderFeverCrystals(ctx, offsetX, offsetY, time);
            this._renderEndParticles(ctx, offsetX, offsetY);
        }

        // Таймер лихорадки (полоска вверху)
        if (this.active) {
            this._renderFeverTimer(ctx, canvasWidth);
        }
    }

    // Отрисовка анонса
    _renderAnnounce(ctx, canvasWidth, canvasHeight, time) {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;

        // Золотая вспышка фона
        ctx.save();
        ctx.globalAlpha = this.announceAlpha * 0.3;
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Текст
        ctx.globalAlpha = this.announceAlpha;
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${24 * this.announceScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff8f00';
        ctx.shadowBlur = 15;
        ctx.fillText('КРИСТАЛЬНАЯ', cx, cy - 18);
        ctx.fillText('ЛИХОРАДКА!', cx, cy + 18);
        ctx.shadowBlur = 0;

        // Блёстки
        for (const s of this.announceSparkles) {
            const alpha = s.life / s.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(cx + s.x, cy + s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Отрисовка кристаллов лихорадки
    _renderFeverCrystals(ctx, offsetX, offsetY, time) {
        const cs = this.cellSize;

        for (const crystal of this.feverCrystals) {
            if (crystal.collected) continue;

            const px = offsetX + crystal.x * cs + cs / 2;
            const py = offsetY + crystal.y * cs + cs / 2;
            const floatY = Math.sin(time * 0.005 + crystal.floatPhase) * 2;
            const size = cs * 0.2;

            ctx.save();
            ctx.globalAlpha = crystal.pulseAlpha * 0.9;

            // Яркое сияние
            ctx.shadowColor = crystal.color;
            ctx.shadowBlur = 10 + Math.sin(time * 0.008 + crystal.floatPhase) * 5;

            // Ромб кристалла
            ctx.beginPath();
            ctx.moveTo(px, py - size + floatY);
            ctx.lineTo(px + size * 0.6, py + floatY);
            ctx.lineTo(px, py + size * 0.5 + floatY);
            ctx.lineTo(px - size * 0.6, py + floatY);
            ctx.closePath();

            // Градиент радуги
            const grad = ctx.createRadialGradient(px, py + floatY, 0, px, py + floatY, size);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, crystal.color);
            grad.addColorStop(1, crystal.color);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Отрисовка частиц окончания
    _renderEndParticles(ctx, offsetX, offsetY) {
        for (const p of this.endParticles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(offsetX + p.x, offsetY + p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // Отрисовка таймера (полоска сверху)
    _renderFeverTimer(ctx, canvasWidth) {
        const progress = this.getProgress();
        const barWidth = canvasWidth - 40;
        const barHeight = 6;
        const barX = 20;
        const barY = 52;

        // Фон полоски
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Активная часть (золотая с градиентом)
        const grad = ctx.createLinearGradient(barX, 0, barX + barWidth * progress, 0);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.5, '#ffab00');
        grad.addColorStop(1, '#ff6f00');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 4;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        ctx.shadowBlur = 0;

        // Счётчик собранных
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.collectedCount}`, canvasWidth - 22, barY + barHeight + 12);
    }
}
