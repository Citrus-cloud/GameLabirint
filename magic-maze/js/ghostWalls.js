// Файл: magic-maze/js/ghostWalls.js
// МЕХАНИКА 2: Призрачные стены — ОПТИМИЗИРОВАНО
// Убраны искры при исчезновении/появлении, упрощена визуализация
// Только плавное fade + лёгкое мерцание контура

class GhostWallSystem {
    constructor() {
        this.walls = [];
        this.active = false;
        this.cycleDuration = 5000;
    }

    // Инициализация для нового уровня
    init(level, matrix, startPos, finishPos, cellSize) {
        this.walls = [];
        this.active = level >= 6;
        this.cellSize = cellSize;

        if (!this.active) return;

        const wallCells = [];
        for (let y = 1; y < matrix.length - 1; y++) {
            for (let x = 1; x < matrix[0].length - 1; x++) {
                if (matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.WALL) {
                    wallCells.push({ x, y });
                }
            }
        }

        // Перемешиваем
        for (let i = wallCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wallCells[i], wallCells[j]] = [wallCells[j], wallCells[i]];
        }

        const targetCount = Math.floor(wallCells.length * (0.15 + Math.random() * 0.05));
        let placed = 0;

        for (const wall of wallCells) {
            if (placed >= targetCount) break;

            matrix[wall.y][wall.x] = GAME_CONSTANTS.CELL_TYPES.PATH;
            const pathWithout = this._bfsCheck(matrix, startPos, finishPos);
            matrix[wall.y][wall.x] = GAME_CONSTANTS.CELL_TYPES.WALL;
            const pathWith = this._bfsCheck(matrix, startPos, finishPos);

            if (pathWithout && pathWith) {
                const phaseOffset = (Math.random() - 0.5) * 600;
                this.walls.push({
                    x: wall.x,
                    y: wall.y,
                    phaseOffset: phaseOffset,
                    isSolid: true,
                    transitionAlpha: 1,
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

    // Обновление каждый кадр — УПРОЩЕНО (без искр)
    update(deltaTime, time, matrix, player) {
        if (!this.active) return;

        for (const wall of this.walls) {
            const adjustedTime = time + wall.phaseOffset;
            const cycleProgress = (adjustedTime % this.cycleDuration) / this.cycleDuration;
            const wasSolid = wall.isSolid;

            wall.isSolid = cycleProgress < 0.5;

            // Плавная анимация перехода (только fade)
            if (wall.isSolid) {
                wall.transitionAlpha = Math.min(1, wall.transitionAlpha + deltaTime * 0.004);
            } else {
                wall.transitionAlpha = Math.max(0, wall.transitionAlpha - deltaTime * 0.004);
            }

            // Обновление фазы мерцания
            wall.glowPhase += deltaTime * 0.002;

            // Смена состояния — обновляем матрицу (без искр!)
            if (wasSolid !== wall.isSolid) {
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
        }
    }

    // Выталкивание лисёнка
    _pushPlayer(wall, matrix, player) {
        const dirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
        for (const d of dirs) {
            const nx = wall.x + d.dx;
            const ny = wall.y + d.dy;
            if (nx >= 0 && ny >= 0 && ny < matrix.length && nx < matrix[0].length &&
                matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                player.gridX = nx;
                player.gridY = ny;
                player.pixelX = nx * player.cellSize;
                player.pixelY = ny * player.cellSize;
                player.targetX = player.pixelX;
                player.targetY = player.pixelY;
                player.isMoving = false;
                player.triggerEmotion('surprised', 800);
                return;
            }
        }
    }

    // Проверка проходимости
    isBlocked(x, y) {
        for (const wall of this.walls) {
            if (wall.x === x && wall.y === y && wall.isSolid) {
                return true;
            }
        }
        return false;
    }

    // Отрисовка — УПРОЩЕНА (только fade + мерцание контура, без волн и искр)
    render(ctx, offsetX, offsetY, time) {
        if (!this.active) return;

        const cs = this.cellSize;

        for (const wall of this.walls) {
            const px = offsetX + wall.x * cs;
            const py = offsetY + wall.y * cs;
            const alpha = wall.transitionAlpha;
            // Простая пульсация яркости контура
            const glowPulse = Math.sin(wall.glowPhase) * 0.2 + 0.8;

            if (alpha > 0.01) {
                // Стена видима — полупрозрачный голубой блок
                ctx.globalAlpha = alpha * 0.55;
                ctx.fillStyle = 'rgba(100, 150, 220, 0.5)';
                ctx.fillRect(px, py, cs, cs);

                // Мерцающий контур (простой, без shadowBlur)
                ctx.globalAlpha = alpha * glowPulse * 0.7;
                ctx.strokeStyle = `rgba(180, 220, 255, ${glowPulse})`;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
            } else {
                // Стена исчезла — лёгкая подсветка пола
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = '#80d8ff';
                ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
            }

            ctx.globalAlpha = 1;
        }
    }
}
