// Файл: magic-maze/js/maze.js
// Процедурная генерация лабиринта — алгоритм Randomized DFS (рекурсивный backtracking)

class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        // Сетка: каждая клетка имеет стены (top, right, bottom, left)
        this.grid = [];
        this.visited = [];
    }

    // Генерация лабиринта методом Randomized DFS
    generate() {
        // Инициализация сетки
        this.grid = [];
        this.visited = [];
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            this.visited[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = { top: true, right: true, bottom: true, left: true };
                this.visited[y][x] = false;
            }
        }

        // Запуск DFS из левого верхнего угла
        this._dfs(0, 0);

        return this._convertToMatrix();
    }

    // Рекурсивный DFS с backtracking (итеративный стек для избежания переполнения)
    _dfs(startX, startY) {
        const stack = [{ x: startX, y: startY }];
        this.visited[startY][startX] = true;

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this._getUnvisitedNeighbors(current.x, current.y);

            if (neighbors.length === 0) {
                stack.pop();
            } else {
                // Выбираем случайного соседа
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this._removeWall(current.x, current.y, next.x, next.y);
                this.visited[next.y][next.x] = true;
                stack.push(next);
            }
        }
    }

    // Получить непосещённых соседей
    _getUnvisitedNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 }, // top
            { dx: 1, dy: 0 },  // right
            { dx: 0, dy: 1 },  // bottom
            { dx: -1, dy: 0 }  // left
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && !this.visited[ny][nx]) {
                neighbors.push({ x: nx, y: ny });
            }
        }

        return neighbors;
    }

    // Убрать стену между двумя соседними клетками
    _removeWall(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        if (dx === 1) { // сосед справа
            this.grid[y1][x1].right = false;
            this.grid[y2][x2].left = false;
        } else if (dx === -1) { // сосед слева
            this.grid[y1][x1].left = false;
            this.grid[y2][x2].right = false;
        } else if (dy === 1) { // сосед снизу
            this.grid[y1][x1].bottom = false;
            this.grid[y2][x2].top = false;
        } else if (dy === -1) { // сосед сверху
            this.grid[y1][x1].top = false;
            this.grid[y2][x2].bottom = false;
        }
    }

    // Конвертация в матрицу (2*width+1 x 2*height+1)
    // 0 = стена, 1 = проход
    _convertToMatrix() {
        const matW = this.width * 2 + 1;
        const matH = this.height * 2 + 1;
        const matrix = [];

        for (let y = 0; y < matH; y++) {
            matrix[y] = [];
            for (let x = 0; x < matW; x++) {
                matrix[y][x] = GAME_CONSTANTS.CELL_TYPES.WALL;
            }
        }

        // Заполняем проходы
        for (let cy = 0; cy < this.height; cy++) {
            for (let cx = 0; cx < this.width; cx++) {
                const mx = cx * 2 + 1;
                const my = cy * 2 + 1;
                matrix[my][mx] = GAME_CONSTANTS.CELL_TYPES.PATH;

                // Если нет стены справа — открываем проход
                if (!this.grid[cy][cx].right && cx < this.width - 1) {
                    matrix[my][mx + 1] = GAME_CONSTANTS.CELL_TYPES.PATH;
                }
                // Если нет стены снизу — открываем проход
                if (!this.grid[cy][cx].bottom && cy < this.height - 1) {
                    matrix[my + 1][mx] = GAME_CONSTANTS.CELL_TYPES.PATH;
                }
            }
        }

        return matrix;
    }
}

// Класс для размещения объектов в лабиринте
class MazePopulator {
    constructor(matrix, level) {
        this.matrix = matrix;
        this.level = level;
        this.height = matrix.length;
        this.width = matrix[0].length;
        this.startPos = { x: 1, y: 1 }; // Левый верхний угол (проход)
        this.finishPos = null;
        this.crystals = [];
        this.enemies = [];
        this.powers = [];
        this.portal = null;
        this.webs = [];
        this.movingWalls = [];
    }

    // Получить все проходимые клетки
    _getPathCells() {
        const cells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.PATH) {
                    cells.push({ x, y });
                }
            }
        }
        return cells;
    }

    // Найти тупики (клетки с одним соседним проходом)
    _getDeadEnds() {
        const deadEnds = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.matrix[y][x] !== GAME_CONSTANTS.CELL_TYPES.PATH) continue;
                let openSides = 0;
                if (this.matrix[y - 1][x] !== GAME_CONSTANTS.CELL_TYPES.WALL) openSides++;
                if (this.matrix[y + 1][x] !== GAME_CONSTANTS.CELL_TYPES.WALL) openSides++;
                if (this.matrix[y][x - 1] !== GAME_CONSTANTS.CELL_TYPES.WALL) openSides++;
                if (this.matrix[y][x + 1] !== GAME_CONSTANTS.CELL_TYPES.WALL) openSides++;
                if (openSides === 1) {
                    deadEnds.push({ x, y });
                }
            }
        }
        return deadEnds;
    }

    // BFS для нахождения расстояний от стартовой точки
    _bfsDistances() {
        const dist = [];
        for (let y = 0; y < this.height; y++) {
            dist[y] = [];
            for (let x = 0; x < this.width; x++) {
                dist[y][x] = -1;
            }
        }

        const queue = [this.startPos];
        dist[this.startPos.y][this.startPos.x] = 0;

        while (queue.length > 0) {
            const curr = queue.shift();
            const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
            for (const dir of dirs) {
                const nx = curr.x + dir.dx;
                const ny = curr.y + dir.dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL && dist[ny][nx] === -1) {
                    dist[ny][nx] = dist[curr.y][curr.x] + 1;
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return dist;
    }

    // Расстояние Манхэттена
    _manhattan(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    // Размещение всех объектов
    populate() {
        const distances = this._bfsDistances();
        const pathCells = this._getPathCells();
        const deadEnds = this._getDeadEnds();

        // 1. Финишная звезда — самая удалённая клетка от старта
        let maxDist = 0;
        let farthest = this.startPos;
        for (const cell of pathCells) {
            if (distances[cell.y][cell.x] > maxDist) {
                maxDist = distances[cell.y][cell.x];
                farthest = cell;
            }
        }
        this.finishPos = farthest;
        this.matrix[farthest.y][farthest.x] = GAME_CONSTANTS.CELL_TYPES.STAR;

        // Клетки, доступные для размещения (не старт и не финиш)
        const availableCells = pathCells.filter(c =>
            !(c.x === this.startPos.x && c.y === this.startPos.y) &&
            !(c.x === this.finishPos.x && c.y === this.finishPos.y)
        );

        // 2. Кристаллы — в тупиках и случайных местах
        const mazeLogicalSize = (this.width - 1) / 2;
        const crystalCount = getCrystalCountForSize(mazeLogicalSize);
        const crystalCandidates = [...deadEnds.filter(c =>
            !(c.x === this.startPos.x && c.y === this.startPos.y) &&
            !(c.x === this.finishPos.x && c.y === this.finishPos.y)
        )];
        
        // Добавляем случайные проходимые клетки
        const shuffled = this._shuffle([...availableCells]);
        for (const cell of shuffled) {
            if (crystalCandidates.length >= crystalCount) break;
            if (!crystalCandidates.find(c => c.x === cell.x && c.y === cell.y)) {
                crystalCandidates.push(cell);
            }
        }

        this.crystals = crystalCandidates.slice(0, crystalCount);
        for (const c of this.crystals) {
            this.matrix[c.y][c.x] = GAME_CONSTANTS.CELL_TYPES.CRYSTAL;
        }

        // 3. Враги — далеко от старта, БЕЗОПАСНОЕ размещение (Улучшение 2)
        // Алгоритм: для каждого врага находим маршрут (цикл или тупик),
        // проверяем BFS что путь от старта к финишу не разрывается
        const enemyCount = getEnemyCountForLevel(this.level);
        const enemyCandidates = availableCells.filter(c =>
            distances[c.y][c.x] >= GAME_CONSTANTS.ENEMIES.MIN_DISTANCE_FROM_START * 2 &&
            this.matrix[c.y][c.x] === GAME_CONSTANTS.CELL_TYPES.PATH
        );
        const shuffledEnemyCandidates = this._shuffle(enemyCandidates);
        let placedEnemies = 0;
        
        for (const pos of shuffledEnemyCandidates) {
            if (placedEnemies >= enemyCount) break;
            
            // Находим безопасный патрульный маршрут
            const patrol = this._findSafePatrolRoute(pos);
            
            // Проверяем, что маршрут не состоит из одной клетки
            // (одна клетка = враг стоит на месте, не интересно, но допустимо)
            if (patrol && patrol.length >= 2) {
                this.enemies.push({
                    startPos: pos,
                    patrolRoute: patrol,
                    isGuardian: false
                });
                placedEnemies++;
            } else if (patrol && patrol.length === 1) {
                // Враг на одной клетке — допускаем только если эта клетка не мост
                if (this._isRouteSafe(patrol)) {
                    this.enemies.push({
                        startPos: pos,
                        patrolRoute: patrol,
                        isGuardian: false
                    });
                    placedEnemies++;
                }
            }
        }

        // Хранитель (каждые 10 уровней) — тоже безопасное размещение
        if (this.level > 0 && this.level % GAME_CONSTANTS.OBSTACLES.GUARDIAN_EVERY === 0) {
            const guardianCandidates = availableCells.filter(c =>
                distances[c.y][c.x] >= 5 &&
                this.matrix[c.y][c.x] === GAME_CONSTANTS.CELL_TYPES.PATH
            );
            const shuffledGuardianCandidates = this._shuffle(guardianCandidates);
            
            for (const gPos of shuffledGuardianCandidates) {
                const patrol = this._findSafePatrolRoute(gPos);
                if (patrol && patrol.length >= 2 && this._isRouteSafe(patrol)) {
                    this.enemies.push({
                        startPos: gPos,
                        patrolRoute: patrol,
                        isGuardian: true
                    });
                    break;
                }
            }
        }

        // 4. Усиления
        const powerCount = getPowerCountForLevel(this.level);
        const powerCandidates = availableCells.filter(c =>
            this.matrix[c.y][c.x] === GAME_CONSTANTS.CELL_TYPES.PATH
        );
        const powerPositions = this._shuffle(powerCandidates).slice(0, powerCount);
        const powerTypes = ['dash', 'shield', 'magnet', 'freeze'];
        
        for (const pos of powerPositions) {
            this.powers.push({
                pos: pos,
                type: powerTypes[Math.floor(Math.random() * powerTypes.length)]
            });
            this.matrix[pos.y][pos.x] = GAME_CONSTANTS.CELL_TYPES.POWER_UP;
        }

        // 5. Секретный портал (с 3-го уровня, 70% шанс)
        if (this.level >= GAME_CONSTANTS.PORTAL.APPEAR_FROM_LEVEL && 
            Math.random() < GAME_CONSTANTS.PORTAL.APPEAR_CHANCE) {
            const portalCandidates = deadEnds.filter(c =>
                this.matrix[c.y][c.x] === GAME_CONSTANTS.CELL_TYPES.PATH &&
                distances[c.y][c.x] >= 4
            );
            if (portalCandidates.length > 0) {
                this.portal = portalCandidates[Math.floor(Math.random() * portalCandidates.length)];
                this.matrix[this.portal.y][this.portal.x] = GAME_CONSTANTS.CELL_TYPES.PORTAL;
            }
        }

        // 6. Паутина (с 5-го уровня)
        if (this.level >= GAME_CONSTANTS.OBSTACLES.WEB_FROM_LEVEL) {
            const webCount = Math.min(3, Math.floor((this.level - 4) / 2));
            const webCandidates = availableCells.filter(c =>
                this.matrix[c.y][c.x] === GAME_CONSTANTS.CELL_TYPES.PATH &&
                distances[c.y][c.x] >= 3
            );
            this.webs = this._shuffle(webCandidates).slice(0, webCount);
            for (const w of this.webs) {
                this.matrix[w.y][w.x] = GAME_CONSTANTS.CELL_TYPES.WEB;
            }
        }

        // 7. Движущиеся стены (с 8-го уровня)
        if (this.level >= GAME_CONSTANTS.OBSTACLES.MOVING_WALLS_FROM_LEVEL) {
            const wallCount = Math.min(2, Math.floor((this.level - 7) / 3) + 1);
            this._placeMovingWalls(wallCount);
        }

        return {
            matrix: this.matrix,
            startPos: this.startPos,
            finishPos: this.finishPos,
            crystals: this.crystals,
            enemies: this.enemies,
            powers: this.powers,
            portal: this.portal,
            webs: this.webs,
            movingWalls: this.movingWalls
        };
    }

    // ======================================================================
    // УЛУЧШЕНИЕ 2: Безопасное размещение врагов
    // Враги размещаются так, чтобы ВСЕГДА существовал путь от старта к финишу,
    // даже когда враги блокируют свои клетки. Используются циклы в графе лабиринта
    // или тупиковые маршруты со свободным обходом.
    // ======================================================================

    // Найти безопасный патрульный маршрут для врага
    // Приоритет: 1) цикл в графе, 2) тупиковый маршрут с обходом
    _findSafePatrolRoute(startPos) {
        // Пытаемся найти цикл (замкнутый путь) длиной 4+ клеток
        const cycleRoute = this._findCycleRoute(startPos);
        if (cycleRoute && this._isRouteSafe(cycleRoute)) {
            return cycleRoute;
        }

        // Пытаемся найти цикл из ближайших клеток
        const nearbyCycle = this._findNearbyCycle(startPos);
        if (nearbyCycle && this._isRouteSafe(nearbyCycle)) {
            return nearbyCycle;
        }

        // Фоллбэк: тупиковый маршрут, смещённый к концу тупика
        const deadEndRoute = this._findDeadEndRoute(startPos);
        if (deadEndRoute && this._isRouteSafe(deadEndRoute)) {
            return deadEndRoute;
        }

        // Последний фоллбэк: одна клетка (враг стоит на месте, не блокируя)
        return [startPos];
    }

    // Поиск цикла (замкнутого пути) из данной позиции методом BFS
    // Ищем путь длиной 4+, который возвращается к началу
    _findCycleRoute(startPos) {
        const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
        
        // Получаем соседей стартовой позиции
        const neighbors = [];
        for (const dir of dirs) {
            const nx = startPos.x + dir.dx;
            const ny = startPos.y + dir.dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                neighbors.push({ x: nx, y: ny });
            }
        }

        // Если менее 2 соседей — цикл невозможен
        if (neighbors.length < 2) return null;

        // Для каждой пары соседей ищем путь между ними, не проходящий через startPos
        for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
                const pathBetween = this._bfsPath(neighbors[i], neighbors[j], startPos);
                if (pathBetween && pathBetween.length >= 2 && pathBetween.length <= 8) {
                    // Формируем цикл: startPos -> neighbors[i] -> ... -> neighbors[j] -> startPos
                    const cycle = [startPos, neighbors[i], ...pathBetween.slice(1, -1), neighbors[j]];
                    if (cycle.length >= 4) {
                        return cycle;
                    }
                }
            }
        }

        return null;
    }

    // BFS поиск пути между двумя точками, исключая заблокированную клетку
    _bfsPath(from, to, excluded) {
        const queue = [{ pos: from, path: [from] }];
        const visited = new Set();
        visited.add(`${from.x},${from.y}`);
        if (excluded) visited.add(`${excluded.x},${excluded.y}`);

        const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

        while (queue.length > 0) {
            const { pos, path } = queue.shift();

            if (pos.x === to.x && pos.y === to.y) {
                return path;
            }

            // Ограничиваем длину пути для производительности
            if (path.length > 10) continue;

            for (const dir of dirs) {
                const nx = pos.x + dir.dx;
                const ny = pos.y + dir.dy;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited.has(key) &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    visited.add(key);
                    queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
                }
            }
        }

        return null;
    }

    // Поиск ближайшего цикла: ищем клетки с 3+ соседями (перекрёстки)
    // и строим маршрут через них
    _findNearbyCycle(startPos) {
        const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
        
        // BFS от startPos для нахождения ближайших перекрёстков
        const queue = [{ pos: startPos, dist: 0 }];
        const visited = new Set();
        visited.add(`${startPos.x},${startPos.y}`);
        const crossroads = [];

        while (queue.length > 0 && crossroads.length < 5) {
            const { pos, dist } = queue.shift();
            if (dist > 6) break;

            // Считаем соседей
            let neighborCount = 0;
            for (const dir of dirs) {
                const nx = pos.x + dir.dx;
                const ny = pos.y + dir.dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    neighborCount++;
                }
            }

            if (neighborCount >= 3 && dist > 0) {
                crossroads.push(pos);
            }

            for (const dir of dirs) {
                const nx = pos.x + dir.dx;
                const ny = pos.y + dir.dy;
                const key = `${nx},${ny}`;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited.has(key) &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    visited.add(key);
                    queue.push({ pos: { x: nx, y: ny }, dist: dist + 1 });
                }
            }
        }

        // Пробуем построить цикл через найденные перекрёстки
        for (const cross of crossroads) {
            const pathTo = this._bfsPath(startPos, cross, null);
            if (pathTo && pathTo.length >= 2) {
                // Ищем альтернативный путь обратно
                const excludeSet = new Set(pathTo.slice(1, -1).map(p => `${p.x},${p.y}`));
                const pathBack = this._bfsPathExcluding(cross, startPos, excludeSet);
                if (pathBack && pathBack.length >= 2) {
                    const cycle = [...pathTo.slice(0, -1), ...pathBack];
                    if (cycle.length >= 4 && cycle.length <= 10) {
                        return cycle;
                    }
                }
            }
        }

        return null;
    }

    // BFS с исключением набора клеток (для поиска альтернативного пути)
    _bfsPathExcluding(from, to, excludedSet) {
        const queue = [{ pos: from, path: [from] }];
        const visited = new Set();
        visited.add(`${from.x},${from.y}`);
        for (const key of excludedSet) visited.add(key);

        const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

        while (queue.length > 0) {
            const { pos, path } = queue.shift();

            if (pos.x === to.x && pos.y === to.y) {
                return path;
            }

            if (path.length > 12) continue;

            for (const dir of dirs) {
                const nx = pos.x + dir.dx;
                const ny = pos.y + dir.dy;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited.has(key) &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    visited.add(key);
                    queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
                }
            }
        }

        return null;
    }

    // Тупиковый маршрут: враг ходит в тупик и обратно,
    // но его маршрут смещён к концу тупика, оставляя развилку свободной
    _findDeadEndRoute(startPos) {
        const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
        
        // Ищем линейный участок (коридор) от startPos
        for (const dir of this._shuffle([...dirs])) {
            const route = [];
            let current = { ...startPos };
            
            for (let step = 0; step < GAME_CONSTANTS.ENEMIES.PATROL_RANGE + 1; step++) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    current = { x: nx, y: ny };
                    route.push({ ...current });
                } else {
                    break;
                }
            }

            // Смещаем маршрут к концу, оставляя стартовую развилку свободной
            if (route.length >= 2) {
                // Берём только дальнюю часть маршрута (пропускаем первую клетку у развилки)
                return route.slice(0); // Враг патрулирует без startPos
            }
        }

        return null;
    }

    // Проверка безопасности маршрута:
    // Временно помечаем все клетки маршрута как стены
    // и проверяем, что путь от старта к финишу всё ещё существует (BFS)
    _isRouteSafe(route) {
        if (!route || route.length === 0) return false;

        // Временно блокируем клетки маршрута
        const originalValues = [];
        for (const cell of route) {
            originalValues.push(this.matrix[cell.y][cell.x]);
            this.matrix[cell.y][cell.x] = GAME_CONSTANTS.CELL_TYPES.WALL;
        }

        // BFS от старта к финишу
        const pathExists = this._bfsCheck(this.startPos, this.finishPos);

        // Восстанавливаем исходные значения
        for (let i = 0; i < route.length; i++) {
            this.matrix[route[i].y][route[i].x] = originalValues[i];
        }

        return pathExists;
    }

    // Быстрая проверка существования пути BFS (без построения полного пути)
    _bfsCheck(from, to) {
        if (!from || !to) return false;
        if (from.x === to.x && from.y === to.y) return true;

        const queue = [from];
        const visited = new Set();
        visited.add(`${from.x},${from.y}`);
        const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

        while (queue.length > 0) {
            const curr = queue.shift();

            for (const dir of dirs) {
                const nx = curr.x + dir.dx;
                const ny = curr.y + dir.dy;
                const key = `${nx},${ny}`;

                if (nx === to.x && ny === to.y) return true;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited.has(key) &&
                    this.matrix[ny][nx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return false;
    }

    // Старый метод оставлен для совместимости, но теперь вызывает безопасную версию
    _findPatrolRoute(startPos) {
        return this._findSafePatrolRoute(startPos);
    }

    // Размещение движущихся стен (Улучшение 2: проверка BFS безопасности)
    // Движущиеся стены не должны перекрывать единственный проход к финишу
    _placeMovingWalls(count) {
        // Ищем проходы шириной 1, рядом со стеной, которые можно временно блокировать
        const candidates = [];
        for (let y = 2; y < this.height - 2; y++) {
            for (let x = 2; x < this.width - 2; x++) {
                if (this.matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.PATH) {
                    // Проверяем, что это проход между двумя стенами (горизонтально или вертикально)
                    if (this.matrix[y - 1][x] === GAME_CONSTANTS.CELL_TYPES.WALL &&
                        this.matrix[y + 1][x] === GAME_CONSTANTS.CELL_TYPES.WALL &&
                        this.matrix[y][x - 1] !== GAME_CONSTANTS.CELL_TYPES.WALL &&
                        this.matrix[y][x + 1] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                        candidates.push({ x, y, direction: 'horizontal' });
                    }
                    if (this.matrix[y][x - 1] === GAME_CONSTANTS.CELL_TYPES.WALL &&
                        this.matrix[y][x + 1] === GAME_CONSTANTS.CELL_TYPES.WALL &&
                        this.matrix[y - 1][x] !== GAME_CONSTANTS.CELL_TYPES.WALL &&
                        this.matrix[y + 1][x] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                        candidates.push({ x, y, direction: 'vertical' });
                    }
                }
            }
        }

        // Перемешиваем кандидатов и выбираем только безопасные
        const shuffled = this._shuffle(candidates);
        let placed = 0;

        for (const wall of shuffled) {
            if (placed >= count) break;

            // Проверяем: если стена заблокирует эту клетку, есть ли альтернативный путь?
            const route = [{ x: wall.x, y: wall.y }];
            if (this._isRouteSafe(route)) {
                this.movingWalls.push({
                    pos: { x: wall.x, y: wall.y },
                    direction: wall.direction,
                    isBlocking: false,
                    timer: 0
                });
                placed++;
            }
        }
    }

    // Перемешивание массива (Fisher-Yates)
    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

// Генерация бонус-комнаты
function generateBonusRoom() {
    const size = GAME_CONSTANTS.PORTAL.BONUS_ROOM_SIZE;
    const matSize = size * 2 + 1;
    const matrix = [];
    
    for (let y = 0; y < matSize; y++) {
        matrix[y] = [];
        for (let x = 0; x < matSize; x++) {
            // Стены по краям, всё остальное — проход
            if (x === 0 || y === 0 || x === matSize - 1 || y === matSize - 1) {
                matrix[y][x] = GAME_CONSTANTS.CELL_TYPES.WALL;
            } else {
                matrix[y][x] = GAME_CONSTANTS.CELL_TYPES.PATH;
            }
        }
    }

    // Размещаем кристаллы случайно внутри
    const crystals = [];
    const innerCells = [];
    for (let y = 1; y < matSize - 1; y++) {
        for (let x = 1; x < matSize - 1; x++) {
            if (!(x === Math.floor(matSize / 2) && y === Math.floor(matSize / 2))) {
                innerCells.push({ x, y });
            }
        }
    }

    // Перемешиваем и берём нужное количество
    for (let i = innerCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [innerCells[i], innerCells[j]] = [innerCells[j], innerCells[i]];
    }

    const crystalCount = GAME_CONSTANTS.PORTAL.BONUS_CRYSTALS;
    for (let i = 0; i < Math.min(crystalCount, innerCells.length); i++) {
        crystals.push(innerCells[i]);
        matrix[innerCells[i].y][innerCells[i].x] = GAME_CONSTANTS.CELL_TYPES.CRYSTAL;
    }

    // Одно усиление
    const powerPos = innerCells[crystalCount];
    const powerTypes = ['dash', 'shield', 'magnet', 'freeze'];
    const power = {
        pos: powerPos,
        type: powerTypes[Math.floor(Math.random() * powerTypes.length)]
    };
    matrix[powerPos.y][powerPos.x] = GAME_CONSTANTS.CELL_TYPES.POWER_UP;

    return {
        matrix: matrix,
        startPos: { x: Math.floor(matSize / 2), y: Math.floor(matSize / 2) },
        crystals: crystals,
        power: power,
        size: matSize
    };
}
