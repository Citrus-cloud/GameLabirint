// Файл: magic-maze/js/magicFlower.js
// МЕХАНИКА 4: Волшебный цветок-таймер — временный бонус с обратным отсчётом
// Появляется с 4-го уровня, раз в 20-30 секунд

class MagicFlower {
    constructor(x, y, cellSize) {
        this.x = x;
        this.y = y;
        this.cellSize = cellSize;

        // Состояние: 'alive', 'collected', 'wilted'
        this.state = 'alive';

        // Таймер (8 секунд)
        this.maxTime = 8000;
        this.timeLeft = this.maxTime;

        // Анимация бутона
        this.budPhase = 0;
        this.petalAngle = 0; // 0 = закрыт, 1 = раскрыт
        this.stemSwayPhase = Math.random() * Math.PI * 2;
        this.stemSway = 0;

        // Анимация раскрытия
        this.openProgress = 0;
        this.openParticles = [];

        // Анимация увядания
        this.wiltProgress = 0;
        this.wiltParticles = [];
        this.spawnedShadow = false; // Породил ли тень

        // Награда
        this.reward = null;
    }

    // Обновление каждый кадр
    update(deltaTime) {
        if (this.state === 'alive') {
            this.timeLeft -= deltaTime;
            this.budPhase += deltaTime * 0.004;
            this.stemSwayPhase += deltaTime * 0.002;
            this.stemSway = Math.sin(this.stemSwayPhase) * 2;

            if (this.timeLeft <= 0) {
                this.state = 'wilted';
                this.wiltProgress = 0;
            }
        } else if (this.state === 'collected') {
            this.openProgress += deltaTime * 0.003;
            // Обновление частиц раскрытия
            for (let i = this.openParticles.length - 1; i >= 0; i--) {
                const p = this.openParticles[i];
                p.life -= deltaTime;
                p.x += p.vx * (deltaTime / 16);
                p.y += p.vy * (deltaTime / 16);
                p.vy += 0.03 * (deltaTime / 16);
                p.alpha = p.life / p.maxLife;
                if (p.life <= 0) this.openParticles.splice(i, 1);
            }
        } else if (this.state === 'wilted') {
            this.wiltProgress += deltaTime * 0.002;
            // Обновление частиц увядания
            for (let i = this.wiltParticles.length - 1; i >= 0; i--) {
                const p = this.wiltParticles[i];
                p.life -= deltaTime;
                p.x += p.vx * (deltaTime / 16);
                p.y += p.vy * (deltaTime / 16);
                p.vy += 0.04 * (deltaTime / 16);
                p.alpha = p.life / p.maxLife;
                p.rotation += 0.02;
                if (p.life <= 0) this.wiltParticles.splice(i, 1);
            }
        }
    }

    // Подобрать цветок (лисёнок дошёл)
    collect() {
        if (this.state !== 'alive') return null;
        this.state = 'collected';
        this.openProgress = 0;

        // Генерируем частицы раскрытия
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            this.openParticles.push({
                x: 0, y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 800 + Math.random() * 400,
                maxLife: 1000,
                alpha: 1,
                size: 2 + Math.random() * 3,
                color: ['#ffd700', '#ff69b4', '#ffffff'][Math.floor(Math.random() * 3)]
            });
        }

        // Определяем награду
        const roll = Math.random();
        if (roll < 0.7) {
            // 70% — кристаллы (5-8)
            const count = 5 + Math.floor(Math.random() * 4);
            this.reward = { type: 'crystals', amount: count };
        } else if (roll < 0.9) {
            // 20% — случайное усиление
            const powers = ['dash', 'shield', 'magnet', 'freeze'];
            this.reward = { type: 'power', power: powers[Math.floor(Math.random() * powers.length)] };
        } else {
            // 10% — дополнительная жизнь
            this.reward = { type: 'life' };
        }

        return this.reward;
    }

    // Проверка: нужно ли породить тень (при увядании)
    shouldSpawnShadow() {
        if (this.state === 'wilted' && !this.spawnedShadow && this.wiltProgress > 0.5) {
            this.spawnedShadow = true;
            return true;
        }
        return false;
    }

    // Проверка завершения анимации
    isFinished() {
        if (this.state === 'collected') return this.openProgress > 1.5;
        if (this.state === 'wilted') return this.wiltProgress > 2;
        return false;
    }

    // Получить прогресс таймера (0-1, где 1 = полное время)
    getTimerProgress() {
        return Math.max(0, this.timeLeft / this.maxTime);
    }

    // Получить цвет таймера (зелёный → жёлтый → красный)
    getTimerColor() {
        const progress = this.getTimerProgress();
        if (progress > 0.625) return '#4caf50'; // Зелёный (8-5с)
        if (progress > 0.25) return '#ffeb3b';  // Жёлтый (5-2с)
        return '#f44336';                        // Красный (2-0с)
    }

    // Отрисовка
    render(ctx, offsetX, offsetY, time) {
        const cs = this.cellSize;
        const px = offsetX + this.x * cs + cs / 2 + this.stemSway;
        const py = offsetY + this.y * cs + cs / 2;

        ctx.save();

        if (this.state === 'alive') {
            this._renderAlive(ctx, px, py, cs, time);
        } else if (this.state === 'collected') {
            this._renderCollected(ctx, px, py, cs, time);
        } else if (this.state === 'wilted') {
            this._renderWilted(ctx, px, py, cs, time);
        }

        ctx.restore();
    }

    // Отрисовка живого цветка
    _renderAlive(ctx, px, py, cs, time) {
        const size = cs * 0.3;
        const budBob = Math.sin(this.budPhase) * 2;

        // Стебель с градиентом
        const stemGrad = ctx.createLinearGradient(px, py + size * 0.3, px, py + size * 1.5);
        stemGrad.addColorStop(0, '#7cb342');
        stemGrad.addColorStop(1, '#4caf50');
        ctx.strokeStyle = stemGrad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, py + size * 0.3);
        ctx.quadraticCurveTo(px + this.stemSway * 0.5, py + size, px, py + size * 1.5);
        ctx.stroke();

        // Два листочка
        ctx.fillStyle = '#66bb6a';
        ctx.save();
        ctx.translate(px - 3, py + size * 0.9);
        ctx.rotate(-0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.2, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(px + 3, py + size * 1.1);
        ctx.rotate(0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.2, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Бутон (нераскрывшийся)
        ctx.save();
        ctx.translate(px, py + budBob);

        // Лепестки (полупрозрачные, закрытые)
        const petalColors = ['#e91e63', '#f06292', '#f48fb1', '#ff80ab', '#ff4081'];
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i + Math.sin(time * 0.001) * 0.05;
            ctx.save();
            ctx.rotate(angle);
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = petalColors[i];
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.2, size * 0.12, size * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();

            // Прожилки
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#c2185b';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.05);
            ctx.lineTo(0, -size * 0.4);
            ctx.stroke();

            ctx.restore();
        }

        // Свечение изнутри
        ctx.globalAlpha = 0.3 + Math.sin(time * 0.003) * 0.1;
        const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.25);
        innerGlow.addColorStop(0, '#fff176');
        innerGlow.addColorStop(1, 'rgba(255, 241, 118, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Круг обратного отсчёта над цветком
        this._renderTimer(ctx, px, py - size * 0.8 + budBob);
    }

    // Отрисовка таймера (кольцо)
    _renderTimer(ctx, x, y) {
        const radius = 10;
        const progress = this.getTimerProgress();
        const color = this.getTimerColor();

        // Фон кольца (тёмный)
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 12, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Активная часть (по часовой стрелке)
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y - 12, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Цифра секунд
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(this.timeLeft / 1000).toString(), x, y - 12);
    }

    // Отрисовка собранного цветка (раскрытие)
    _renderCollected(ctx, px, py, cs, time) {
        if (this.openProgress > 1) return;

        const size = cs * 0.3;
        const openScale = Math.min(1, this.openProgress * 2);

        // Лепестки раскрываются
        ctx.save();
        ctx.translate(px, py);
        ctx.globalAlpha = 1 - this.openProgress;

        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i + openScale * 0.5;
            const dist = size * 0.2 + openScale * size * 0.5;
            ctx.save();
            ctx.rotate(angle);
            ctx.translate(0, -dist);
            ctx.fillStyle = ['#e91e63', '#f06292', '#f48fb1', '#ff80ab', '#ff4081'][i];
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.15 * (1 + openScale * 0.5), size * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();

        // Частицы раскрытия
        for (const p of this.openParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(px + p.x * 15, py + p.y * 15, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // Отрисовка увядшего цветка
    _renderWilted(ctx, px, py, cs, time) {
        if (this.wiltProgress > 1.5) return;

        const size = cs * 0.3;
        const wilt = Math.min(1, this.wiltProgress);

        // Стебель поникает
        ctx.save();
        ctx.globalAlpha = 1 - wilt * 0.5;
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py + size * 0.3);
        ctx.quadraticCurveTo(px + wilt * 8, py + size, px + wilt * 5, py + size * 1.5);
        ctx.stroke();

        // Лепестки скукоживаются и опадают
        ctx.translate(px, py);
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            const fallDist = wilt * size * 1.5;
            ctx.save();
            ctx.rotate(angle + wilt * 0.5);
            ctx.translate(0, -size * 0.2 + fallDist * 0.5);
            ctx.globalAlpha = (1 - wilt) * 0.6;
            ctx.fillStyle = '#795548';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.1 * (1 - wilt * 0.5), size * 0.2 * (1 - wilt * 0.3), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }
}

// Менеджер волшебных цветков
class MagicFlowerManager {
    constructor() {
        this.flowers = [];
        this.active = false;
        this.spawnTimer = 0;
        this.spawnInterval = 0; // 20-30 секунд
        this.level = 1;
        this.matrix = null;
        this.cellSize = 0;
        this.startPos = null;
        this.finishPos = null;
    }

    // Инициализация для уровня
    init(level, matrix, cellSize, startPos, finishPos) {
        this.flowers = [];
        this.level = level;
        this.matrix = matrix;
        this.cellSize = cellSize;
        this.startPos = startPos;
        this.finishPos = finishPos;
        this.active = level >= 4;
        this.spawnTimer = 0;
        this._scheduleNextSpawn();
    }

    // Расписание следующего появления
    _scheduleNextSpawn() {
        this.spawnInterval = 20000 + Math.random() * 10000; // 20-30с
    }

    // Обновление
    update(deltaTime) {
        if (!this.active) return;

        // Таймер появления
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.flowers.filter(f => f.state === 'alive').length === 0) {
            this._spawnFlower();
            this.spawnTimer = 0;
            this._scheduleNextSpawn();
        }

        // Обновление цветков
        for (const flower of this.flowers) {
            flower.update(deltaTime);
        }

        // Удаление завершённых
        this.flowers = this.flowers.filter(f => !f.isFinished());
    }

    // Появление нового цветка
    _spawnFlower() {
        if (!this.matrix) return;

        // Находим подходящую клетку (проход, не тупик, не старт/финиш)
        const candidates = [];
        for (let y = 0; y < this.matrix.length; y++) {
            for (let x = 0; x < this.matrix[0].length; x++) {
                if (this.matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.WALL) continue;
                if (this.startPos && x === this.startPos.x && y === this.startPos.y) continue;
                if (this.finishPos && x === this.finishPos.x && y === this.finishPos.y) continue;

                // Проверяем что не тупик (минимум 2 выхода)
                let exits = 0;
                const dirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
                for (const d of dirs) {
                    const nx = x + d.dx, ny = y + d.dy;
                    if (nx >= 0 && ny >= 0 && ny < this.matrix.length && nx < this.matrix[0].length &&
                        this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                        exits++;
                    }
                }
                if (exits >= 2) {
                    candidates.push({ x, y });
                }
            }
        }

        if (candidates.length === 0) return;

        const pos = candidates[Math.floor(Math.random() * candidates.length)];
        this.flowers.push(new MagicFlower(pos.x, pos.y, this.cellSize));
    }

    // Проверка сбора лисёнком
    checkCollection(playerGridX, playerGridY) {
        for (const flower of this.flowers) {
            if (flower.state === 'alive' && flower.x === playerGridX && flower.y === playerGridY) {
                return flower.collect();
            }
        }
        return null;
    }

    // Проверка: нужно ли породить тень (увядшие цветки)
    checkShadowSpawn() {
        for (const flower of this.flowers) {
            if (flower.shouldSpawnShadow()) {
                return { x: flower.x, y: flower.y };
            }
        }
        return null;
    }

    // Отрисовка всех цветков
    render(ctx, offsetX, offsetY, time) {
        for (const flower of this.flowers) {
            flower.render(ctx, offsetX, offsetY, time);
        }
    }
}
