// Файл: magic-maze/js/ghostWalls.js
// МЕХАНИКА 2: Призрачные стены — полупрозрачные стены, исчезающие и появляющиеся
// Появляются с 6-го уровня, ~15-20% стен становятся призрачными

class GhostWallSystem {
    constructor() {
        this.walls = [];        // Список призрачных стен
        this.active = false;    // Активна ли система
        this.cycleDuration = 5000; // Полный цикл: 2.5с стена + 2.5с проход
    }

    // Инициализация для нового уровня
    init(level, matrix, startPos, finishPos, cellSize) {
        this.walls = [];
        this.active = level >= 6;
        this.cellSize = cellSize;

        if (!this.active) return;

        // Находим все стены, которые можно сделать призрачными
        const wallCells = [];
        for (let y = 1; y < matrix.length - 1; y++) {
            for (let x = 1; x < matrix[0].length - 1; x++) {
                if (matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.WALL) {
                    wallCells.push({ x, y });
                }
            }
        }

        // Перемешиваем стены
        for (let i = wallCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wallCells[i], wallCells[j]] = [wallCells[j], wallCells[i]];
        }

        // Выбираем 15-20% стен
        const targetCount = Math.floor(wallCells.length * (0.15 + Math.random() * 0.05));
        let placed = 0;

        for (const wall of wallCells) {
            if (placed >= targetCount) break;

            // Проверяем BFS: если убрать эту стену, путь от старта к финишу
            // должен оставаться (стена не критична для прохождения)
            // Также проверяем: если стена ЕСТЬ, путь тоже остаётся
            // Это гарантирует, что стена декоративная и её можно убирать/добавлять

            // Временно убираем стену
            matrix[wall.y][wall.x] = GAME_CONSTANTS.CELL_TYPES.PATH;
            const pathWithout = this._bfsCheck(matrix, startPos, finishPos);
            // Восстанавливаем
            matrix[wall.y][wall.x] = GAME_CONSTANTS.CELL_TYPES.WALL;

            // Путь должен существовать и без этой стены (иначе не интересно)
            // и С этой стеной (иначе она критична)
            const pathWith = this._bfsCheck(matrix, startPos, finishPos);

            if (pathWithout && pathWith) {
                // Случайный сдвиг фазы ±0.3с
                const phaseOffset = (Math.random() - 0.5) * 600;

                this.walls.push({
                    x: wall.x,
                    y: wall.y,
                    phaseOffset: phaseOffset,
                    isSolid: true,       // Текущее состояние
                    transitionAlpha: 1,  // Прозрачность для анимации
                    sparkles: [],        // Искры при переходе
                    glowPhase: Math.random() * Math.PI * 2
                });
                placed++;
            }
        }
    }

    // BFS проверка пути
    _bfsCheck(matrix, from, to) {
        if (!from || !to) return false;
        const queue = [from];
        const visited = new Set();
        visited.add(`${from.x},${from.y}`);
        const dirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];

        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.x === to.x && curr.y === to.y) return true;

            for (const d of dirs) {
                const nx = curr.x + d.dx;
                const ny = curr.y + d.dy;
                const key = `${nx},${ny}`;
                if (nx >= 0 && ny >= 0 && ny < matrix.length && nx < matrix[0].length &&
                    !visited.has(key) && matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
        return false;
    }

    // Обновление каждый кадр
    update(deltaTime, time, matrix, player) {
        if (!this.active) return;

        for (const wall of this.walls) {
            // Определяем фазу цикла
            const adjustedTime = time + wall.phaseOffset;
            const cycleProgress = (adjustedTime % this.cycleDuration) / this.cycleDuration;
            const wasSolid = wall.isSolid;

            // 0-0.5 = стена (непроходима), 0.5-1.0 = проход
            wall.isSolid = cycleProgress < 0.5;

            // Плавная анимация перехода
            if (wall.isSolid) {
                wall.transitionAlpha = Math.min(1, wall.transitionAlpha + deltaTime * 0.004);
            } else {
                wall.transitionAlpha = Math.max(0, wall.transitionAlpha - deltaTime * 0.004);
            }

            // Обновление свечения
            wall.glowPhase += deltaTime * 0.003;

            // Генерация искр при смене состояния
            if (wasSolid !== wall.isSolid) {
                this._generateSparkles(wall);

                // Обновляем матрицу!
                if (wall.isSolid) {
                    matrix[wall.y][wall.x] = GAME_CONSTANTS.CELL_TYPES.WALL;
                } else {
                    matrix[wall.y][wall.x] = GAME_CONSTANTS.CELL_TYPES.PATH;
                }

                // Если лисёнок стоит на клетке, где появляется стена — выталкиваем
                if (wall.isSolid && player &&
                    player.gridX === wall.x && player.gridY === wall.y) {
                    this._pushPlayer(wall, matrix, player);
                }
            }

            // Обновление искр
            for (let i = wall.sparkles.length - 1; i >= 0; i--) {
                const s = wall.sparkles[i];
                s.life -= deltaTime;
                s.x += s.vx * (deltaTime / 16);
                s.y += s.vy * (deltaTime / 16);
                s.alpha = s.life / s.maxLife;
                if (s.life <= 0) wall.sparkles.splice(i, 1);
            }
        }
    }

    // Генерация искр при смене состояния
    _generateSparkles(wall) {
        const cx = wall.x * this.cellSize + this.cellSize / 2;
        const cy = wall.y * this.cellSize + this.cellSize / 2;
        const count = 10 + Math.floor(Math.random() * 3);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            wall.sparkles.push({
                x: cx + (Math.random() - 0.5) * this.cellSize * 0.5,
                y: cy + (Math.random() - 0.5) * this.cellSize * 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 500 + Math.random() * 300,
                maxLife: 700,
                alpha: 1,
                size: 2 + Math.random() * 2
            });
        }
    }

    // Выталкивание лисёнка при появлении стены
    _pushPlayer(wall, matrix, player) {
        const dirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
        for (const d of dirs) {
            const nx = wall.x + d.dx;
            const ny = wall.y + d.dy;
            if (nx >= 0 && ny >= 0 && ny < matrix.length && nx < matrix[0].length &&
                matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                // Перемещаем лисёнка
                player.gridX = nx;
                player.gridY = ny;
                player.pixelX = nx * player.cellSize;
                player.pixelY = ny * player.cellSize;
                player.targetX = player.pixelX;
                player.targetY = player.pixelY;
                player.isMoving = false;
                // Эмоция удивления
                player.triggerEmotion('surprised', 800);
                return;
            }
        }
    }

    // Проверка проходимости клетки (для системы ввода)
    isBlocked(x, y) {
        for (const wall of this.walls) {
            if (wall.x === x && wall.y === y && wall.isSolid) {
                return true;
            }
        }
        return false;
    }

    // Отрисовка призрачных стен
    render(ctx, offsetX, offsetY, time) {
        if (!this.active) return;

        const cs = this.cellSize;

        for (const wall of this.walls) {
            const px = offsetX + wall.x * cs;
            const py = offsetY + wall.y * cs;
            const alpha = wall.transitionAlpha;
            const glowPulse = Math.sin(wall.glowPhase) * 0.3 + 0.7;

            ctx.save();

            if (alpha > 0.01) {
                // Стена видима (полупрозрачная с мерцающим контуром)
                ctx.globalAlpha = alpha * 0.6;

                // Фон стены (полупрозрачный)
                const grad = ctx.createLinearGradient(px, py, px + cs, py + cs);
                grad.addColorStop(0, `rgba(100, 150, 220, ${alpha * 0.4})`);
                grad.addColorStop(0.5, `rgba(150, 200, 255, ${alpha * 0.3})`);
                grad.addColorStop(1, `rgba(80, 130, 200, ${alpha * 0.4})`);
                ctx.fillStyle = grad;
                ctx.fillRect(px, py, cs, cs);

                // Мерцающий контур
                ctx.globalAlpha = alpha * glowPulse * 0.8;
                ctx.strokeStyle = `rgba(180, 220, 255, ${glowPulse})`;
                ctx.lineWidth = 2;
                ctx.shadowColor = '#80d8ff';
                ctx.shadowBlur = 6 + Math.sin(time * 0.005 + wall.phaseOffset) * 3;
                ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);

                // Волнообразное искажение (вертикальные линии)
                ctx.globalAlpha = alpha * 0.3;
                ctx.strokeStyle = 'rgba(200, 240, 255, 0.5)';
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 3; i++) {
                    const offsetWave = Math.sin(time * 0.002 + i * 2 + wall.phaseOffset) * 3;
                    ctx.beginPath();
                    ctx.moveTo(px + cs * (i + 1) / 4 + offsetWave, py + 4);
                    ctx.lineTo(px + cs * (i + 1) / 4 - offsetWave, py + cs - 4);
                    ctx.stroke();
                }

                ctx.shadowBlur = 0;
            } else {
                // Стена исчезла — лёгкое голубоватое свечение на полу
                ctx.globalAlpha = 0.15 + Math.sin(wall.glowPhase * 2) * 0.05;
                ctx.fillStyle = '#80d8ff';
                ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
            }

            // Искры
            for (const s of wall.sparkles) {
                ctx.globalAlpha = s.alpha * 0.8;
                ctx.fillStyle = '#b3e5fc';
                ctx.shadowColor = '#80d8ff';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(offsetX + s.x, offsetY + s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}
