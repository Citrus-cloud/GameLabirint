// Файл: magic-maze/js/crystalFever.js
// МЕХАНИКА 6: Кристальная лихорадка — ОПТИМИЗИРОВАНО
// Кристаллы без градиентов, яркие квадраты со свечением
// Лимит видимых кристаллов: 30

class CrystalFeverSystem {
    constructor() {
        this.active = false;
        this.announced = false;
        this.triggered = false;

        this.triggerDelay = 0;
        this.announceTimer = 0;
        this.feverTimer = 0;
        this.maxFeverTime = 20000;

        this.feverCrystals = [];
        this.collectedCount = 0;
        this.totalSpawned = 0;

        this.announceScale = 0;
        this.announceAlpha = 0;
        this.announceSparkles = [];
        this.endParticles = [];
        this.megaCollectShown = false;

        this.level = 1;
        this.cellSize = 0;
        this.matrix = null;
        this.playerGridX = 0;
        this.playerGridY = 0;

        // Жёсткий лимит одновременно видимых кристаллов (по ТЗ — 20).
        this.MAX_VISIBLE_CRYSTALS = 20;
    }

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

        if (level >= 2 && Math.random() < 1 / 12) {
            this.triggered = true;
            this.triggerDelay = 10000 + Math.random() * 10000;
        }
    }

    update(deltaTime, playerGridX, playerGridY) {
        this.playerGridX = playerGridX;
        this.playerGridY = playerGridY;

        if (this.triggered && !this.active && !this.announced) {
            this.triggerDelay -= deltaTime;
            if (this.triggerDelay <= 0) {
                this._startAnnounce();
            }
            return;
        }

        if (this.announced && !this.active) {
            this.announceTimer -= deltaTime;
            this.announceScale = Math.min(1.2, this.announceScale + deltaTime * 0.005);
            this.announceAlpha = Math.min(1, this.announceAlpha + deltaTime * 0.003);

            // Блёстки анонса (уменьшено количество)
            if (Math.random() < 0.2) {
                this.announceSparkles.push({
                    x: (Math.random() - 0.5) * 250,
                    y: (Math.random() - 0.5) * 80,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -1 - Math.random(),
                    life: 500, maxLife: 500,
                    size: 2 + Math.random() * 3,
                    color: ['#ffd700', '#ff69b4', '#87ceeb', '#ffffff'][Math.floor(Math.random() * 4)]
                });
            }

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

        if (this.active) {
            this.feverTimer -= deltaTime;

            for (const crystal of this.feverCrystals) {
                if (crystal.collected) continue;
                crystal.blinkTime -= deltaTime;
                if (crystal.blinkTime <= 0) {
                    crystal.collected = true;
                }
                crystal.pulseAlpha = crystal.blinkTime < crystal.maxBlinkTime * 0.3 ?
                    (Math.sin(performance.now() * 0.015) * 0.5 + 0.5) : 1;
            }

            if (this.feverTimer <= 0) {
                this._endFever();
            }

            // Обновление частиц окончания (уменьшено)
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

    _startAnnounce() {
        this.announced = true;
        this.announceTimer = 2000;
        this.announceScale = 0;
        this.announceAlpha = 0;
    }

    _startFever() {
        this.active = true;
        this.feverTimer = this.maxFeverTime;
        this.collectedCount = 0;
        this._spawnFeverCrystals();
    }

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
                if (x === this.playerGridX && y === this.playerGridY) continue;

                const blinkTime = 300 + Math.random() * 1200 + Math.random() * this.maxFeverTime * 0.7;

                this.feverCrystals.push({
                    x, y,
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

    _endFever() {
        this.active = false;
        // Все оставшиеся — просто помечаем collected (без массовых частиц)
        let particleCount = 0;
        for (const crystal of this.feverCrystals) {
            if (!crystal.collected) {
                crystal.collected = true;
                // Ограничиваем частицы окончания
                if (particleCount < 10) {
                    this.endParticles.push({
                        x: crystal.x * this.cellSize + this.cellSize / 2,
                        y: crystal.y * this.cellSize + this.cellSize / 2,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -2 - Math.random() * 2,
                        life: 600, maxLife: 600,
                        size: 3, color: '#ffd700'
                    });
                    particleCount++;
                }
            }
        }

        if (this.collectedCount >= 40) {
            this.megaCollectShown = true;
        }
    }

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

    checkMegaCollect() {
        if (this.megaCollectShown) {
            this.megaCollectShown = false;
            return true;
        }
        return false;
    }

    getProgress() {
        if (!this.active) return 0;
        return this.feverTimer / this.maxFeverTime;
    }

    // Отрисовка — УПРОЩЕНА
    render(ctx, offsetX, offsetY, time, canvasWidth, canvasHeight) {
        if (this.announced && !this.active) {
            this._renderAnnounce(ctx, canvasWidth, canvasHeight, time);
            return;
        }

        if (this.active || this.endParticles.length > 0) {
            this._renderFeverCrystals(ctx, offsetX, offsetY, time);
            this._renderEndParticles(ctx, offsetX, offsetY);
        }

        if (this.active) {
            this._renderFeverTimer(ctx, canvasWidth);
        }
    }

    _renderAnnounce(ctx, canvasWidth, canvasHeight, time) {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;

        ctx.save();
        ctx.globalAlpha = this.announceAlpha * 0.25;
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.globalAlpha = this.announceAlpha;
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${24 * this.announceScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('КРИСТАЛЬНАЯ', cx, cy - 18);
        ctx.fillText('ЛИХОРАДКА!', cx, cy + 18);

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

    // Отрисовка кристаллов лихорадки — простые яркие квадраты с тенью.
    // По ТЗ: без внутренней детализации, только виртуальный «глянцевый кубик»,
    // лимит 20 видимых, остальные не рисуются (они физически собираемы,
    // но визуально не показываются — игроку проще ориентироваться).
    _renderFeverCrystals(ctx, offsetX, offsetY, time) {
        const cs = this.cellSize;
        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;
        let visibleCount = 0;
        const halfSize = cs * 0.18;

        for (const crystal of this.feverCrystals) {
            if (crystal.collected) continue;
            if (visibleCount >= this.MAX_VISIBLE_CRYSTALS) break;

            const px = offsetX + crystal.x * cs + cs / 2;
            const py = offsetY + crystal.y * cs + cs / 2;

            // Viewport culling — не рисуем за пределами canvas
            if (px < -cs || px > canvasW + cs || py < -cs || py > canvasH + cs) continue;

            visibleCount++;

            // Простой квадрат с тенью — самый дешёвый способ изобразить кристалл.
            ctx.save();
            ctx.globalAlpha = crystal.pulseAlpha * 0.9;
            ctx.fillStyle = crystal.color;
            ctx.shadowColor = crystal.color;
            ctx.shadowBlur = 5;
            ctx.fillRect(px - halfSize, py - halfSize, halfSize * 2, halfSize * 2);
            ctx.shadowBlur = 0;
            // Лёгкий белый блик в углу — делает «кристалличный» вид без градиентов.
            ctx.globalAlpha = crystal.pulseAlpha * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px - halfSize * 0.7, py - halfSize * 0.7, halfSize * 0.5, halfSize * 0.5);
            ctx.restore();
        }
    }

    _renderEndParticles(ctx, offsetX, offsetY) {
        for (const p of this.endParticles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(offsetX + p.x, offsetY + p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _renderFeverTimer(ctx, canvasWidth) {
        const progress = this.getProgress();
        const barWidth = canvasWidth - 40;
        const barHeight = 5;
        const barX = 20;
        const barY = 52;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Простая заливка без градиента
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.collectedCount}`, canvasWidth - 22, barY + barHeight + 12);
    }
}
