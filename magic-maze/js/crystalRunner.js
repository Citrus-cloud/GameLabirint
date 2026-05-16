// Файл: magic-maze/js/crystalRunner.js
// МЕХАНИКА 1: Кристалл-непоседа — живой кристалл, убегающий от лисёнка
// Появляется с 3-го уровня, 1-2 штуки на уровень

class CrystalRunner {
    constructor(x, y, cellSize) {
        this.x = x;
        this.y = y;
        this.cellSize = cellSize;
        this.collected = false;
        this.trapped = false; // Загнан в тупик

        // Анимация покачивания
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleAngle = 0;

        // Глазки
        this.eyePhase = Math.random() * Math.PI * 2;
        this.blinkTimer = 0;
        this.isBlinking = false;

        // Движение
        this.isMoving = false;
        this.moveProgress = 0;
        this.moveStartX = x * cellSize;
        this.moveStartY = y * cellSize;
        this.pixelX = x * cellSize;
        this.pixelY = y * cellSize;
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;
        this.moveDuration = 200; // мс на перемещение

        // Задержка перед побегом
        this.fleeDelay = 0;
        this.isFleeing = false;

        // Дрожание при загнанности
        this.tremble = 0;

        // Частицы следа
        this.trail = [];

        // Очки за поимку
        this.points = 30;
    }

    // Обновление каждый кадр
    update(deltaTime, playerGridX, playerGridY, matrix) {
        if (this.collected) return;

        // Покачивание
        this.wobblePhase += deltaTime * 0.004;
        this.wobbleAngle = Math.sin(this.wobblePhase) * 0.2;

        // Глазки — моргание
        this.eyePhase += deltaTime * 0.003;
        this.blinkTimer += deltaTime;
        if (!this.isBlinking && this.blinkTimer > 3000 + Math.random() * 2000) {
            this.isBlinking = true;
            this.blinkTimer = 0;
        }
        if (this.isBlinking && this.blinkTimer > 150) {
            this.isBlinking = false;
            this.blinkTimer = 0;
        }

        // Движение (анимация)
        if (this.isMoving) {
            this.moveProgress += deltaTime / this.moveDuration;
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.pixelX = this.targetPixelX;
                this.pixelY = this.targetPixelY;
            } else {
                const t = 1 - (1 - this.moveProgress) * (1 - this.moveProgress);
                this.pixelX = this.moveStartX + (this.targetPixelX - this.moveStartX) * t;
                this.pixelY = this.moveStartY + (this.targetPixelY - this.moveStartY) * t;
            }
            // Генерируем частицы следа
            if (Math.random() < 0.5) {
                this.trail.push({
                    x: this.pixelX + this.cellSize / 2 + (Math.random() - 0.5) * 6,
                    y: this.pixelY + this.cellSize / 2 + (Math.random() - 0.5) * 6,
                    life: 400,
                    maxLife: 400,
                    size: 2 + Math.random() * 2
                });
            }
        }

        // Обновление следа
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= deltaTime;
            if (this.trail[i].life <= 0) this.trail.splice(i, 1);
        }

        // Проверка расстояния до лисёнка
        if (!this.isMoving && !this.collected) {
            const dist = Math.abs(this.x - playerGridX) + Math.abs(this.y - playerGridY);

            if (dist <= 2 && !this.trapped) {
                // Лисёнок рядом — запускаем побег с задержкой
                if (!this.isFleeing) {
                    this.isFleeing = true;
                    this.fleeDelay = 300; // 0.3 секунды задержка
                }
            }

            // Обработка задержки побега
            if (this.isFleeing) {
                this.fleeDelay -= deltaTime;
                if (this.fleeDelay <= 0) {
                    this._tryFlee(playerGridX, playerGridY, matrix);
                    this.isFleeing = false;
                }
            }
        }

        // Дрожание при загнанности
        if (this.trapped) {
            this.tremble = Math.sin(performance.now() * 0.03) * 2;
        } else {
            this.tremble = 0;
        }
    }

    // Попытка убежать от лисёнка
    _tryFlee(playerX, playerY, matrix) {
        const dirs = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];

        // Сортируем направления: приоритет — противоположное от лисёнка
        const sortedDirs = dirs.sort((a, b) => {
            const distA = Math.abs((this.x + a.dx) - playerX) + Math.abs((this.y + a.dy) - playerY);
            const distB = Math.abs((this.x + b.dx) - playerX) + Math.abs((this.y + b.dy) - playerY);
            return distB - distA; // Дальше от игрока — выше приоритет
        });

        // Ищем свободную клетку
        for (const dir of sortedDirs) {
            const nx = this.x + dir.dx;
            const ny = this.y + dir.dy;

            if (nx >= 0 && ny >= 0 && ny < matrix.length && nx < matrix[0].length &&
                matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                // Убегаем
                this.x = nx;
                this.y = ny;
                this.moveStartX = this.pixelX;
                this.moveStartY = this.pixelY;
                this.targetPixelX = nx * this.cellSize;
                this.targetPixelY = ny * this.cellSize;
                this.isMoving = true;
                this.moveProgress = 0;
                this.trapped = false;
                return;
            }
        }

        // Не удалось убежать — загнан в тупик!
        this.trapped = true;
    }

    // Проверка сбора лисёнком
    checkCollection(playerGridX, playerGridY) {
        if (this.collected || this.isMoving) return false;
        return this.x === playerGridX && this.y === playerGridY;
    }

    // Подобрать кристалл
    collect() {
        this.collected = true;
    }

    // Отрисовка кристалла-непоседы
    render(ctx, offsetX, offsetY, time) {
        if (this.collected) return;

        const cs = this.cellSize;
        const px = offsetX + this.pixelX + cs / 2 + this.tremble;
        const py = offsetY + this.pixelY + cs / 2;
        const floatY = Math.sin(time * 0.003 + this.wobblePhase) * 3;
        const size = cs * 0.3;

        ctx.save();

        // След из искр
        for (const t of this.trail) {
            const alpha = t.life / t.maxLife;
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(offsetX + t.x, offsetY + t.y, t.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Покачивание
        ctx.translate(px, py + floatY);
        ctx.rotate(this.wobbleAngle);

        // Свечение
        ctx.shadowColor = this.trapped ? '#ff69b4' : '#ffd700';
        ctx.shadowBlur = 12 + Math.sin(time * 0.005) * 4;

        // Тело кристалла (ромб с гранями)
        const grad = ctx.createLinearGradient(-size * 0.7, -size, size * 0.7, size * 0.6);
        grad.addColorStop(0, '#fff0f5');
        grad.addColorStop(0.3, '#ffd700');
        grad.addColorStop(0.7, '#ff69b4');
        grad.addColorStop(1, '#ffa000');

        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size * 0.6);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Грани (блики)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size * 0.6);
        ctx.moveTo(-size * 0.7, 0);
        ctx.lineTo(size * 0.7, 0);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Глазки (озорные)
        const eyeY = -size * 0.15;
        const eyeSpacing = size * 0.25;
        const eyeSize = size * 0.12;

        if (!this.isBlinking) {
            // Белки
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-eyeSpacing, eyeY, eyeSize * 1.3, 0, Math.PI * 2);
            ctx.arc(eyeSpacing, eyeY, eyeSize * 1.3, 0, Math.PI * 2);
            ctx.fill();

            // Зрачки (смотрят в сторону движения)
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(-eyeSpacing + 1, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.arc(eyeSpacing + 1, eyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // Блики
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-eyeSpacing + 2, eyeY - 1.5, eyeSize * 0.4, 0, Math.PI * 2);
            ctx.arc(eyeSpacing + 2, eyeY - 1.5, eyeSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Моргание — линия
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-eyeSpacing - eyeSize, eyeY);
            ctx.lineTo(-eyeSpacing + eyeSize, eyeY);
            ctx.moveTo(eyeSpacing - eyeSize, eyeY);
            ctx.lineTo(eyeSpacing + eyeSize, eyeY);
            ctx.stroke();
        }

        // Ротик (озорная улыбка)
        if (this.trapped) {
            // Испуганный рот
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(0, size * 0.15, size * 0.08, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, size * 0.1, size * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Менеджер кристаллов-непосед
class CrystalRunnerManager {
    constructor() {
        this.runners = [];
    }

    // Инициализация для уровня
    init(level, matrix, cellSize, startPos, finishPos, existingCrystals) {
        this.runners = [];

        // Появляется с 3-го уровня
        if (level < 3) return;

        // 1-2 штуки на уровень (редкий!)
        const count = Math.random() < 0.6 ? 1 : 2;

        // Находим подходящие клетки (проход, не старт, не финиш, не занята кристаллом)
        const candidates = [];
        const occupied = new Set();
        occupied.add(`${startPos.x},${startPos.y}`);
        occupied.add(`${finishPos.x},${finishPos.y}`);
        for (const c of existingCrystals) {
            occupied.add(`${c.x},${c.y}`);
        }

        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[0].length; x++) {
                if (matrix[y][x] !== GAME_CONSTANTS.CELL_TYPES.WALL && !occupied.has(`${x},${y}`)) {
                    // Проверяем, что есть хотя бы 2 соседних прохода (не тупик)
                    let exits = 0;
                    const dirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
                    for (const d of dirs) {
                        const nx = x + d.dx, ny = y + d.dy;
                        if (nx >= 0 && ny >= 0 && ny < matrix.length && nx < matrix[0].length &&
                            matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                            exits++;
                        }
                    }
                    if (exits >= 2) {
                        candidates.push({ x, y });
                    }
                }
            }
        }

        // Перемешиваем и выбираем
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        for (let i = 0; i < Math.min(count, candidates.length); i++) {
            this.runners.push(new CrystalRunner(candidates[i].x, candidates[i].y, cellSize));
        }
    }

    // Обновление всех непосед
    update(deltaTime, playerGridX, playerGridY, matrix) {
        for (const runner of this.runners) {
            runner.update(deltaTime, playerGridX, playerGridY, matrix);
        }
    }

    // Проверка сбора
    checkCollection(playerGridX, playerGridY) {
        for (const runner of this.runners) {
            if (runner.checkCollection(playerGridX, playerGridY)) {
                runner.collect();
                return runner;
            }
        }
        return null;
    }

    // Отрисовка
    render(ctx, offsetX, offsetY, time) {
        for (const runner of this.runners) {
            runner.render(ctx, offsetX, offsetY, time);
        }
    }
}
