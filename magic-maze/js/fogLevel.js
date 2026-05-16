// Файл: magic-maze/js/fogLevel.js
// МЕХАНИКА 5: Туманный уровень — ОПТИМИЗИРОВАНО
// Маска видимости обновляется только при смене клетки лисёнка
// Туман — один слой тёмной заливки, без частиц и всполохов
// Светлячки уменьшены до 4 штук (крупные)

class FogLevelSystem {
    constructor() {
        this.active = false;
        this.visibilityRadius = 3;
        this.visibleCells = new Set();
        this.trailCells = [];
        this.fireflies = [];
        this.fadeInProgress = 0;
        this.fadeOutProgress = 0;
        this.isFadingOut = false;
        this.cellSize = 0;
        this.mazeWidth = 0;
        this.mazeHeight = 0;
        // Кеш позиции для обновления маски только при смене клетки
        this._lastPlayerX = -1;
        this._lastPlayerY = -1;
    }

    // Инициализация
    init(level, mazeWidth, mazeHeight, cellSize) {
        this.mazeWidth = mazeWidth;
        this.mazeHeight = mazeHeight;
        this.cellSize = cellSize;
        this.active = (level % 7 === 0) && level > 0;
        this.visibleCells = new Set();
        this.trailCells = [];
        this.fadeInProgress = 0;
        this.fadeOutProgress = 0;
        this.isFadingOut = false;
        this._lastPlayerX = -1;
        this._lastPlayerY = -1;

        if (!this.active) return;

        // Светлячки — всего 4 штуки, крупные
        this.fireflies = [];
        for (let i = 0; i < 4; i++) {
            this.fireflies.push({
                x: Math.random() * mazeWidth * cellSize,
                y: Math.random() * mazeHeight * cellSize,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                phase: Math.random() * Math.PI * 2,
                size: 5 + Math.random() * 4,
                brightness: 0,
                color: Math.random() < 0.5 ? '#ffeb3b' : '#80d8ff'
            });
        }
    }

    isFogLevel(level) {
        return (level % 7 === 0) && level > 0;
    }

    // Обновление видимости — маска пересчитывается ТОЛЬКО при смене клетки
    update(deltaTime, playerGridX, playerGridY) {
        if (!this.active) return;

        // Появление тумана
        if (this.fadeInProgress < 1) {
            this.fadeInProgress += deltaTime * 0.001;
            if (this.fadeInProgress > 1) this.fadeInProgress = 1;
        }

        // Рассеивание
        if (this.isFadingOut) {
            this.fadeOutProgress += deltaTime * 0.002;
            if (this.fadeOutProgress > 1) {
                this.active = false;
                return;
            }
        }

        // Пересчёт маски видимости ТОЛЬКО при переходе на новую клетку
        if (playerGridX !== this._lastPlayerX || playerGridY !== this._lastPlayerY) {
            this._lastPlayerX = playerGridX;
            this._lastPlayerY = playerGridY;
            this._updateVisibility(playerGridX, playerGridY);
        }

        // Обновление шлейфа
        for (let i = this.trailCells.length - 1; i >= 0; i--) {
            this.trailCells[i].life -= deltaTime;
            if (this.trailCells[i].life <= 0) {
                this.trailCells.splice(i, 1);
            }
        }

        // Обновление светлячков (медленное)
        for (const ff of this.fireflies) {
            ff.phase += deltaTime * 0.002;
            ff.brightness = 0.4 + Math.sin(ff.phase) * 0.6;
            ff.x += ff.vx * (deltaTime / 16);
            ff.y += ff.vy * (deltaTime / 16);

            if (ff.x < 0 || ff.x > this.mazeWidth * this.cellSize) ff.vx *= -1;
            if (ff.y < 0 || ff.y > this.mazeHeight * this.cellSize) ff.vy *= -1;

            if (Math.random() < 0.005) {
                ff.vx += (Math.random() - 0.5) * 0.05;
                ff.vy += (Math.random() - 0.5) * 0.05;
            }
            ff.vx = Math.max(-0.4, Math.min(0.4, ff.vx));
            ff.vy = Math.max(-0.4, Math.min(0.4, ff.vy));
        }
    }

    // Пересчёт видимых клеток
    _updateVisibility(playerX, playerY) {
        const prevVisible = new Set(this.visibleCells);
        this.visibleCells.clear();

        const r = this.visibilityRadius;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = playerX + dx;
                const y = playerY + dy;
                if (x >= 0 && y >= 0 && x < this.mazeWidth && y < this.mazeHeight) {
                    if (dx * dx + dy * dy <= r * r + r) {
                        this.visibleCells.add(`${x},${y}`);
                    }
                }
            }
        }

        // Шлейф исчезновения
        for (const key of prevVisible) {
            if (!this.visibleCells.has(key)) {
                const [x, y] = key.split(',').map(Number);
                if (!this.trailCells.find(t => t.x === x && t.y === y)) {
                    this.trailCells.push({ x, y, life: 1000 });
                }
            }
        }
    }

    // Проверка видимости клетки
    isCellVisible(x, y) {
        if (!this.active) return true;
        if (this.isFadingOut) return true;
        if (this.visibleCells.has(`${x},${y}`)) return true;
        return this.trailCells.some(t => t.x === x && t.y === y);
    }

    // Прозрачность тумана для клетки
    getFogAlpha(x, y) {
        if (!this.active) return 0;
        if (this.isFadingOut) return Math.max(0, 1 - this.fadeOutProgress);
        if (this.visibleCells.has(`${x},${y}`)) return 0;

        const trail = this.trailCells.find(t => t.x === x && t.y === y);
        if (trail) {
            return 1 - (trail.life / 1000);
        }
        return this.fadeInProgress;
    }

    // Начать рассеивание
    startFadeOut() {
        this.isFadingOut = true;
        this.fadeOutProgress = 0;
    }

    // Отрисовка тумана — УПРОЩЕНА
    // Один слой тёмной заливки с альфой 0.75, без частиц и градиентов
    render(ctx, offsetX, offsetY, matrix) {
        if (!this.active) return;

        const cs = this.cellSize;

        // Единый слой тумана на невидимых клетках
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                const fogAlpha = this.getFogAlpha(x, y);
                if (fogAlpha <= 0) continue;

                const px = offsetX + x * cs;
                const py = offsetY + y * cs;

                // Простая тёмная заливка
                ctx.globalAlpha = fogAlpha * 0.75;
                ctx.fillStyle = '#0d0520';
                ctx.fillRect(px, py, cs, cs);
            }
        }
        ctx.globalAlpha = 1;

        // Светлячки (крупные, в тумане)
        for (const ff of this.fireflies) {
            ctx.globalAlpha = ff.brightness * 0.7;
            ctx.fillStyle = ff.color;
            ctx.beginPath();
            ctx.arc(offsetX + ff.x, offsetY + ff.y, ff.size, 0, Math.PI * 2);
            ctx.fill();
            // Маленький ореол без shadowBlur (быстрее)
            ctx.globalAlpha = ff.brightness * 0.2;
            ctx.beginPath();
            ctx.arc(offsetX + ff.x, offsetY + ff.y, ff.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
