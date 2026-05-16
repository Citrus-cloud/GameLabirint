// Файл: magic-maze/js/fogLevel.js
// МЕХАНИКА 5: Туманный уровень — ограниченная видимость с атмосферным туманом
// Каждый 7-й уровень (7, 14, 21, 28...)

class FogLevelSystem {
    constructor() {
        this.active = false;
        this.visibilityRadius = 3; // Клеток от лисёнка
        this.visibleCells = new Set(); // Предрасчитанные видимые клетки
        this.trailCells = [];    // Клетки «шлейфа» видимости (задержка 1с)
        this.fogParticles = [];  // Декоративные частицы тумана
        this.fireflies = [];     // Увеличенные светлячки-ориентиры
        this.fadeInProgress = 0; // Появление тумана в начале
        this.fadeOutProgress = 0; // Рассеивание в конце
        this.isFadingOut = false;
        this.cellSize = 0;
        this.mazeWidth = 0;
        this.mazeHeight = 0;
    }

    // Инициализация для уровня
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

        if (!this.active) return;

        // Создаём светлячков (в 2 раза больше обычного)
        this.fireflies = [];
        const fireflyCount = GAME_CONSTANTS.ANIMATIONS.FIREFLY_COUNT * 2;
        for (let i = 0; i < fireflyCount; i++) {
            this.fireflies.push({
                x: Math.random() * mazeWidth * cellSize,
                y: Math.random() * mazeHeight * cellSize,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                phase: Math.random() * Math.PI * 2,
                size: 3 + Math.random() * 4, // Крупнее обычных
                brightness: 0,
                color: Math.random() < 0.5 ? '#ffeb3b' : '#80d8ff'
            });
        }

        // Создаём частицы тумана (для декора)
        this.fogParticles = [];
        for (let i = 0; i < 30; i++) {
            this.fogParticles.push({
                x: Math.random() * mazeWidth * cellSize,
                y: Math.random() * mazeHeight * cellSize,
                size: 30 + Math.random() * 50,
                phase: Math.random() * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.2,
                alpha: 0.1 + Math.random() * 0.15
            });
        }
    }

    // Проверка: является ли уровень туманным
    isFogLevel(level) {
        return (level % 7 === 0) && level > 0;
    }

    // Обновление видимости
    update(deltaTime, playerGridX, playerGridY) {
        if (!this.active) return;

        // Появление тумана
        if (this.fadeInProgress < 1) {
            this.fadeInProgress += deltaTime * 0.001;
            if (this.fadeInProgress > 1) this.fadeInProgress = 1;
        }

        // Рассеивание тумана
        if (this.isFadingOut) {
            this.fadeOutProgress += deltaTime * 0.002;
            if (this.fadeOutProgress > 1) {
                this.active = false;
                return;
            }
        }

        // Пересчёт видимых клеток
        this._updateVisibility(playerGridX, playerGridY);

        // Обновление шлейфа (задержка исчезновения)
        for (let i = this.trailCells.length - 1; i >= 0; i--) {
            this.trailCells[i].life -= deltaTime;
            if (this.trailCells[i].life <= 0) {
                this.trailCells.splice(i, 1);
            }
        }

        // Обновление светлячков
        for (const ff of this.fireflies) {
            ff.phase += deltaTime * 0.003;
            ff.brightness = 0.4 + Math.sin(ff.phase) * 0.6;
            ff.x += ff.vx * (deltaTime / 16);
            ff.y += ff.vy * (deltaTime / 16);

            // Мягкий отскок
            if (ff.x < 0 || ff.x > this.mazeWidth * this.cellSize) ff.vx *= -1;
            if (ff.y < 0 || ff.y > this.mazeHeight * this.cellSize) ff.vy *= -1;

            ff.vx += (Math.random() - 0.5) * 0.03;
            ff.vy += (Math.random() - 0.5) * 0.03;
            ff.vx = Math.max(-0.6, Math.min(0.6, ff.vx));
            ff.vy = Math.max(-0.6, Math.min(0.6, ff.vy));
        }

        // Обновление частиц тумана
        for (const p of this.fogParticles) {
            p.phase += deltaTime * 0.0005;
            p.x += Math.sin(p.phase) * p.speed;
            p.y += Math.cos(p.phase * 0.7) * p.speed * 0.5;
        }
    }

    // Пересчёт видимых клеток (оптимизированный — квадратная область)
    _updateVisibility(playerX, playerY) {
        const prevVisible = new Set(this.visibleCells);
        this.visibleCells.clear();

        const r = this.visibilityRadius;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = playerX + dx;
                const y = playerY + dy;
                if (x >= 0 && y >= 0 && x < this.mazeWidth && y < this.mazeHeight) {
                    // Проверка радиуса (круговая, включая диагонали)
                    if (dx * dx + dy * dy <= r * r + r) {
                        this.visibleCells.add(`${x},${y}`);
                    }
                }
            }
        }

        // Добавляем исчезнувшие клетки в шлейф
        for (const key of prevVisible) {
            if (!this.visibleCells.has(key)) {
                const [x, y] = key.split(',').map(Number);
                // Не дублируем
                if (!this.trailCells.find(t => t.x === x && t.y === y)) {
                    this.trailCells.push({ x, y, life: 1000 }); // 1 секунда задержка
                }
            }
        }
    }

    // Проверка видимости клетки
    isCellVisible(x, y) {
        if (!this.active) return true;
        if (this.isFadingOut) return true;
        if (this.visibleCells.has(`${x},${y}`)) return true;
        // Проверяем шлейф
        return this.trailCells.some(t => t.x === x && t.y === y);
    }

    // Получить прозрачность тумана для клетки (для плавного перехода)
    getFogAlpha(x, y) {
        if (!this.active) return 0;
        if (this.isFadingOut) return Math.max(0, 1 - this.fadeOutProgress);
        if (this.visibleCells.has(`${x},${y}`)) return 0;

        // Шлейф — полупрозрачный
        const trail = this.trailCells.find(t => t.x === x && t.y === y);
        if (trail) {
            return 1 - (trail.life / 1000); // Постепенное затуманивание
        }

        return this.fadeInProgress; // Полный туман
    }

    // Начать рассеивание тумана (при завершении уровня)
    startFadeOut() {
        this.isFadingOut = true;
        this.fadeOutProgress = 0;
    }

    // Отрисовка тумана поверх невидимых клеток
    render(ctx, offsetX, offsetY, matrix) {
        if (!this.active) return;

        const cs = this.cellSize;

        // Слой тумана на каждой невидимой клетке
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                const fogAlpha = this.getFogAlpha(x, y);
                if (fogAlpha <= 0) continue;

                const px = offsetX + x * cs;
                const py = offsetY + y * cs;

                // Основной туман — фиолетово-синий
                ctx.globalAlpha = fogAlpha * 0.85;
                ctx.fillStyle = '#1a0a2e';
                ctx.fillRect(px, py, cs, cs);

                // Дополнительный слой с серебристыми вкраплениями
                ctx.globalAlpha = fogAlpha * 0.2;
                const sparkle = Math.sin((x * 7 + y * 13) + performance.now() * 0.001) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(192, 192, 255, ${sparkle * 0.3})`;
                ctx.fillRect(px, py, cs, cs);
            }
        }
        ctx.globalAlpha = 1;

        // Декоративные частицы тумана (полупрозрачные пятна)
        for (const p of this.fogParticles) {
            const fogCheck = this.getFogAlpha(
                Math.floor(p.x / cs),
                Math.floor(p.y / cs)
            );
            if (fogCheck <= 0.3) continue;

            ctx.globalAlpha = p.alpha * fogCheck;
            const grad = ctx.createRadialGradient(
                offsetX + p.x, offsetY + p.y, 0,
                offsetX + p.x, offsetY + p.y, p.size
            );
            grad.addColorStop(0, 'rgba(100, 80, 150, 0.3)');
            grad.addColorStop(1, 'rgba(100, 80, 150, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(offsetX + p.x, offsetY + p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Светлячки (видны в тумане, крупные и яркие)
        for (const ff of this.fireflies) {
            ctx.globalAlpha = ff.brightness * 0.8;
            ctx.fillStyle = ff.color;
            ctx.shadowColor = ff.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(offsetX + ff.x, offsetY + ff.y, ff.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Эффект рассеивания (от центра к краям)
        if (this.isFadingOut && this.fadeOutProgress > 0) {
            const progress = this.fadeOutProgress;
            const centerX = offsetX + this.mazeWidth * cs / 2;
            const centerY = offsetY + this.mazeHeight * cs / 2;
            const maxRadius = Math.sqrt(Math.pow(this.mazeWidth * cs, 2) + Math.pow(this.mazeHeight * cs, 2)) / 2;
            const clearRadius = progress * maxRadius;

            // Рисуем кольцо рассеивания
            ctx.globalAlpha = 0.3 * (1 - progress);
            ctx.strokeStyle = '#80d8ff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#80d8ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(centerX, centerY, clearRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }
}
