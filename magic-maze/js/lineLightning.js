// Файл: magic-maze/js/lineLightning.js
// МЕХАНИКА 3: Линейная молния — молния бьёт в линию из 3 клеток
// Активируется с 7-го уровня с вероятностью 30%

class LineLightningSystem {
    constructor() {
        this.active = false;
        this.isLineStrike = false; // Текущий удар — линейный?
        this.lineTargets = [];     // Массив целевых клеток [{x, y}]
        this.lineBoltSegments = []; // Зигзаг через все клетки
        this.lineBranches = [];
        this.lineSparks = [];
        this.lineAlpha = 0;
        this.lineStrikeTime = 0;
    }

    // Инициализация для уровня
    init(level) {
        this.active = level >= 7;
        this.isLineStrike = false;
        this.lineTargets = [];
        this.lineBoltSegments = [];
        this.lineBranches = [];
        this.lineSparks = [];
        this.lineAlpha = 0;
    }

    // Проверка: должен ли следующий удар быть линейным (30% шанс)
    shouldBeLineStrike() {
        if (!this.active) return false;
        return Math.random() < 0.3;
    }

    // Вычисление линии целей (3 клетки вдоль направления)
    calculateLineTargets(baseX, baseY, direction, matrix) {
        this.lineTargets = [];
        this.isLineStrike = true;

        let dx = 0, dy = 0;
        switch (direction) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
        }

        // Первая клетка — базовая цель
        this.lineTargets.push({ x: baseX, y: baseY });

        // Вторая и третья — в том же направлении
        for (let i = 1; i <= 2; i++) {
            const nx = baseX + dx * i;
            const ny = baseY + dy * i;

            if (nx >= 0 && ny >= 0 && matrix && ny < matrix.length && nx < matrix[0].length &&
                matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                this.lineTargets.push({ x: nx, y: ny });
            } else {
                break; // Стена — линия обрывается
            }
        }

        return this.lineTargets;
    }

    // Генерация зигзага молнии через все клетки линии
    generateLineBolt(cellSize, offsetX, offsetY) {
        if (this.lineTargets.length < 2) return;

        this.lineBoltSegments = [];
        this.lineBranches = [];

        // Начинаем от верхнего края (или бокового, случайно)
        const firstTarget = this.lineTargets[0];
        const lastTarget = this.lineTargets[this.lineTargets.length - 1];

        // Начало — за пределами лабиринта
        const startX = firstTarget.x * cellSize + cellSize / 2 + (Math.random() - 0.5) * 60;
        const startY = -30;

        this.lineBoltSegments.push({ x: startX, y: startY });

        // Проходим через каждую целевую клетку
        for (let t = 0; t < this.lineTargets.length; t++) {
            const target = this.lineTargets[t];
            const endX = target.x * cellSize + cellSize / 2;
            const endY = target.y * cellSize + cellSize / 2;

            const prevPoint = this.lineBoltSegments[this.lineBoltSegments.length - 1];
            const segments = 5 + Math.floor(Math.random() * 3);
            const stepX = (endX - prevPoint.x) / segments;
            const stepY = (endY - prevPoint.y) / segments;

            let cx = prevPoint.x;
            let cy = prevPoint.y;

            for (let i = 1; i < segments; i++) {
                cx += stepX + (Math.random() - 0.5) * 25;
                cy += stepY + (Math.random() - 0.5) * 25;
                this.lineBoltSegments.push({ x: cx, y: cy });

                // Ответвления (25% шанс)
                if (Math.random() < 0.25) {
                    const branch = [{ x: cx, y: cy }];
                    const bAngle = Math.random() * Math.PI * 2;
                    let bx = cx, by = cy;
                    for (let j = 0; j < 3; j++) {
                        bx += Math.cos(bAngle) * 10 + (Math.random() - 0.5) * 8;
                        by += Math.sin(bAngle) * 10 + (Math.random() - 0.5) * 8;
                        branch.push({ x: bx, y: by });
                    }
                    this.lineBranches.push(branch);
                }
            }

            // Точно в целевую клетку
            this.lineBoltSegments.push({ x: endX, y: endY });
        }

        this.lineAlpha = 1;
        this.lineStrikeTime = 0;
    }

    // Генерация искр во всех целевых клетках
    generateLineSparks(cellSize) {
        this.lineSparks = [];
        for (const target of this.lineTargets) {
            const cx = target.x * cellSize + cellSize / 2;
            const cy = target.y * cellSize + cellSize / 2;
            const count = 15;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                this.lineSparks.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 600 + Math.random() * 400,
                    maxLife: 900,
                    size: 1.5 + Math.random() * 2.5,
                    color: Math.random() < 0.4 ? '#ffffff' : '#4fc3f7'
                });
            }
        }
    }

    // Обновление анимации
    update(deltaTime) {
        if (!this.isLineStrike) return;

        this.lineStrikeTime += deltaTime;
        this.lineAlpha = Math.max(0, 1 - this.lineStrikeTime / 500);

        // Обновление искр
        for (let i = this.lineSparks.length - 1; i >= 0; i--) {
            const s = this.lineSparks[i];
            s.life -= deltaTime;
            s.x += s.vx * (deltaTime / 16);
            s.y += s.vy * (deltaTime / 16);
            s.vy += 0.08 * (deltaTime / 16);
            s.vx *= 0.98;
            if (s.life <= 0) this.lineSparks.splice(i, 1);
        }

        // Завершение анимации
        if (this.lineAlpha <= 0 && this.lineSparks.length === 0) {
            this.isLineStrike = false;
            this.lineTargets = [];
        }
    }

    // Проверка попадания по лисёнку (любая из 3 клеток)
    checkHit(playerGridX, playerGridY) {
        for (const target of this.lineTargets) {
            if (target.x === playerGridX && target.y === playerGridY) {
                return true;
            }
        }
        return false;
    }

    // Отрисовка индикации зарядки (все клетки линии пульсируют)
    renderCharging(ctx, offsetX, offsetY, cellSize, progress, pulsePhase) {
        if (this.lineTargets.length === 0) return;

        for (const target of this.lineTargets) {
            const cx = offsetX + target.x * cellSize + cellSize / 2;
            const cy = offsetY + target.y * cellSize + cellSize / 2;

            const pulseFreq = progress < 0.67 ? 2 : 4;
            const pulse = Math.abs(Math.sin(pulsePhase * Math.PI * pulseFreq));
            const brightness = progress;
            const r = Math.floor(30 + brightness * 200);
            const g = Math.floor(100 + brightness * 155);
            const b = Math.floor(200 + brightness * 55);
            const alpha = 0.25 + pulse * 0.4 * brightness;

            ctx.save();
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.shadowBlur = 12 + pulse * 8 * brightness;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

            const pad = 4;
            ctx.beginPath();
            ctx.roundRect(
                cx - cellSize / 2 + pad,
                cy - cellSize / 2 + pad,
                cellSize - pad * 2,
                cellSize - pad * 2,
                4
            );
            ctx.fill();
            ctx.restore();
        }
    }

    // Отрисовка молнии
    renderBolt(ctx, offsetX, offsetY) {
        if (!this.isLineStrike || this.lineAlpha <= 0) return;
        if (this.lineBoltSegments.length < 2) return;

        ctx.save();
        ctx.globalAlpha = this.lineAlpha;

        // Внешнее свечение (широкая синяя)
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.7)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#4fc3f7';
        ctx.shadowBlur = 25;

        ctx.beginPath();
        ctx.moveTo(offsetX + this.lineBoltSegments[0].x, offsetY + this.lineBoltSegments[0].y);
        for (let i = 1; i < this.lineBoltSegments.length; i++) {
            ctx.lineTo(offsetX + this.lineBoltSegments[i].x, offsetY + this.lineBoltSegments[i].y);
        }
        ctx.stroke();

        // Сердцевина (белая)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(offsetX + this.lineBoltSegments[0].x, offsetY + this.lineBoltSegments[0].y);
        for (let i = 1; i < this.lineBoltSegments.length; i++) {
            ctx.lineTo(offsetX + this.lineBoltSegments[i].x, offsetY + this.lineBoltSegments[i].y);
        }
        ctx.stroke();

        // Ответвления
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;

        for (const branch of this.lineBranches) {
            if (branch.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(offsetX + branch[0].x, offsetY + branch[0].y);
            for (let i = 1; i < branch.length; i++) {
                ctx.lineTo(offsetX + branch[i].x, offsetY + branch[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // Отрисовка искр
    renderSparks(ctx, offsetX, offsetY) {
        for (const s of this.lineSparks) {
            const alpha = s.life / s.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.color;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(offsetX + s.x, offsetY + s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    // Сброс
    reset() {
        this.isLineStrike = false;
        this.lineTargets = [];
        this.lineBoltSegments = [];
        this.lineBranches = [];
        this.lineSparks = [];
        this.lineAlpha = 0;
    }
}
