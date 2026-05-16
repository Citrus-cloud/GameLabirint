// Файл: magic-maze/js/skin-effects.js
// Система зрелищных анимаций скинов — постоянные эффекты для каждой ценовой категории
// Оптимизация: ограничение частиц при низком FPS

class SkinEffectsSystem {
    constructor() {
        // Частицы эффектов скинов
        this.particles = [];
        this.trailParticles = [];
        this.orbitParticles = [];
        this.rings = []; // Магические кольца (тир 4)
        
        // Таймеры спецэффектов
        this.specialTimer = 0;       // Таймер для периодических эффектов
        this.flipTimer = 0;          // Таймер кувырка (тир 3)
        this.flipActive = false;
        this.flipAngle = 0;
        this.flyTimer = 0;           // Таймер взлёта (тир 4)
        this.flyActive = false;
        this.flyOffset = 0;
        this.wingsTimer = 0;         // Таймер крыльев (Король теней)
        this.wingsActive = false;
        this.wingsAlpha = 0;
        this.starWaveTimer = 0;      // Таймер волны (Создатель звёзд)
        this.starWaveActive = false;
        this.starWaveRadius = 0;
        
        // Оптимизация
        this.maxParticles = 80;
        this.maxTrailParticles = 40;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsTimer = 0;
        this.lastFrameTime = 0;
        
        // Предыдущая позиция игрока (для шлейфа)
        this.prevX = 0;
        this.prevY = 0;
        
        // Аура (дыхание) для тира 3
        this.auraPhase = 0;
        this.auraIntensity = 0;
        
        // Нимб/корона для тира 3
        this.haloAngle = 0;
        
        // Галактика внутри (тир 5)
        this.galaxyAngle = 0;
        
        // Созвездие (Создатель звёзд)
        this.constellationAngle = 0;
        
        // Щупальца теней (Король теней)
        this.tentacles = [];
        this._initTentacles();
        
        // Вороны-частицы (Король теней)
        this.crows = [];
        this.crowTimer = 0;
        
        // Кристалл-буст (тир 4: усиление при сборе)
        this.crystalBoostTimer = 0;
        this.crystalBoostActive = false;
    }

    // Инициализация щупалец для Короля теней
    _initTentacles() {
        this.tentacles = [];
        for (let i = 0; i < 6; i++) {
            this.tentacles.push({
                baseAngle: (Math.PI * 2 / 6) * i,
                length: 20 + Math.random() * 15,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                width: 2 + Math.random() * 2
            });
        }
    }

    // Мониторинг FPS для оптимизации
    _updateFPS(deltaTime) {
        this.fpsTimer += deltaTime;
        this.fpsCounter++;
        if (this.fpsTimer >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
            // Сокращаем частицы при низком FPS
            if (this.fps < 45) {
                this.maxParticles = 40;
                this.maxTrailParticles = 20;
            } else if (this.fps < 55) {
                this.maxParticles = 60;
                this.maxTrailParticles = 30;
            } else {
                this.maxParticles = 80;
                this.maxTrailParticles = 40;
            }
        }
    }

    // Главный метод обновления — вызывается каждый кадр
    update(deltaTime, player, skin) {
        if (!skin) return;
        this._updateFPS(deltaTime);
        
        const tier = skin.tier;
        const px = player.pixelX + player.cellSize / 2;
        const py = player.pixelY + player.cellSize / 2 - player.bounceOffset;
        const isMoving = player.isMoving;
        
        // Обновление общих частиц
        this._updateParticles(deltaTime);
        this._updateTrail(deltaTime);
        this._updateOrbitParticles(deltaTime);
        
        // Генерация эффектов по тиру
        switch (tier) {
            case 1: this._updateTier1(deltaTime, px, py, isMoving, skin); break;
            case 2: this._updateTier2(deltaTime, px, py, isMoving, skin, player); break;
            case 3: this._updateTier3(deltaTime, px, py, isMoving, skin, player); break;
            case 4: this._updateTier4(deltaTime, px, py, isMoving, skin, player); break;
            case 5: this._updateTier5(deltaTime, px, py, isMoving, skin, player); break;
        }
        
        // Запоминаем позицию для шлейфа
        this.prevX = px;
        this.prevY = py;
    }

    // === ОБНОВЛЕНИЕ ЧАСТИЦ ===
    _updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            if (p.gravity) p.vy += p.gravity * (deltaTime / 16);
            p.alpha = Math.max(0, p.life / p.maxLife);
            if (p.shrink) p.size *= p.shrink;
            if (p.rotation !== undefined) p.rotation += (p.rotSpeed || 0.05) * (deltaTime / 16);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        // Ограничение
        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }

    _updateTrail(deltaTime) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.life -= deltaTime;
            p.alpha = Math.max(0, p.life / p.maxLife);
            if (p.shrink) p.size *= p.shrink;
            if (p.life <= 0) this.trailParticles.splice(i, 1);
        }
        while (this.trailParticles.length > this.maxTrailParticles) {
            this.trailParticles.shift();
        }
    }

    _updateOrbitParticles(deltaTime) {
        for (let i = this.orbitParticles.length - 1; i >= 0; i--) {
            const p = this.orbitParticles[i];
            p.angle += p.speed * (deltaTime / 1000);
            p.wobble += p.wobbleSpeed * (deltaTime / 1000);
        }
    }



    // =======================================================================
    // ГРУППА 1: Скины за 200 кристаллов (Пушистое чудо, Звёздный странник)
    // Лёгкое сияние + искры из хвостика + шлейф при движении
    // =======================================================================
    _updateTier1(deltaTime, px, py, isMoving, skin) {
        // Периодические искры из хвостика (3-5 каждые 2 секунды)
        this.specialTimer += deltaTime;
        if (this.specialTimer > 2000) {
            this.specialTimer = 0;
            const count = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                if (this.particles.length >= this.maxParticles) break;
                this.particles.push({
                    x: px - 12 + Math.random() * 4,
                    y: py + 5 + Math.random() * 4,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: 0.3 + Math.random() * 0.5,
                    life: 1200 + Math.random() * 600,
                    maxLife: 1500,
                    size: 2 + Math.random() * 2.5,
                    alpha: 1,
                    gravity: 0.02,
                    shrink: 0.998,
                    color: skin.glowColor,
                    type: 'spark'
                });
            }
        }
        
        // Шлейф при движении
        if (isMoving && Math.random() < 0.4) {
            if (this.trailParticles.length < this.maxTrailParticles) {
                this.trailParticles.push({
                    x: px + (Math.random() - 0.5) * 6,
                    y: py + (Math.random() - 0.5) * 6,
                    life: 600,
                    maxLife: 600,
                    size: 2 + Math.random() * 2,
                    alpha: 1,
                    shrink: 0.99,
                    color: skin.glowColor
                });
            }
        }
    }

    // =======================================================================
    // ГРУППА 2: Скины за 500 кристаллов (Лесной эльф, Пиратский лис)
    // Вращающиеся орбитальные искры + шлейф + фонтан каждые 7-10с + вспышки лапок
    // =======================================================================
    _updateTier2(deltaTime, px, py, isMoving, skin, player) {
        // Инициализация орбитальных частиц (один раз)
        if (this.orbitParticles.length === 0) {
            const count = 6 + Math.floor(Math.random() * 3); // 6-8
            const isElf = skin.id === 2;
            for (let i = 0; i < count; i++) {
                this.orbitParticles.push({
                    angle: (Math.PI * 2 / count) * i,
                    radiusX: 22 + Math.random() * 5,
                    radiusY: 14 + Math.random() * 4,
                    speed: 1.5 + Math.random() * 0.5,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpeed: 2 + Math.random(),
                    size: 3 + Math.random() * 2,
                    color: isElf ? '#66bb6a' : '#ffd54f',
                    type: isElf ? 'leaf' : 'coin'
                });
            }
        }
        
        // Шлейф из хвоста
        if (isMoving && Math.random() < 0.5) {
            if (this.trailParticles.length < this.maxTrailParticles) {
                const isElf = skin.id === 2;
                this.trailParticles.push({
                    x: px - 12 + (Math.random() - 0.5) * 6,
                    y: py + 3 + (Math.random() - 0.5) * 4,
                    life: 800,
                    maxLife: 800,
                    size: 2.5 + Math.random() * 2,
                    alpha: 1,
                    shrink: 0.99,
                    color: isElf ? '#a5d6a7' : '#ffe082'
                });
            }
        }
        
        // Вспышки у лапок при движении
        if (isMoving && Math.random() < 0.3) {
            if (this.particles.length < this.maxParticles) {
                this.particles.push({
                    x: px + (Math.random() - 0.5) * 10,
                    y: py + 14,
                    vx: 0,
                    vy: 0,
                    life: 200,
                    maxLife: 200,
                    size: 3 + Math.random() * 2,
                    alpha: 1,
                    color: '#ffffff',
                    type: 'flash_small'
                });
            }
        }
        
        // Фонтан каждые 7-10 секунд
        this.specialTimer += deltaTime;
        const interval = 7000 + Math.random() * 3000;
        if (this.specialTimer > interval) {
            this.specialTimer = 0;
            // Сноп искр вверх
            for (let i = 0; i < 12; i++) {
                if (this.particles.length >= this.maxParticles) break;
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
                const speed = 2 + Math.random() * 3;
                this.particles.push({
                    x: px,
                    y: py - 5,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 800 + Math.random() * 400,
                    maxLife: 1000,
                    size: 2.5 + Math.random() * 2.5,
                    alpha: 1,
                    gravity: 0.08,
                    shrink: 0.98,
                    color: skin.glowColor,
                    type: 'spark'
                });
            }
        }
    }

    // =======================================================================
    // ГРУППА 3: Скины за 1500 кристаллов (Огненный хвост, Ледяной принц)
    // Аура + кувырок с частицами каждые 3-4с + дорожка + нимб + частицы лапок
    // =======================================================================
    _updateTier3(deltaTime, px, py, isMoving, skin, player) {
        const isFire = skin.effect === 'fire';
        
        // Пульсирующая аура (дыхание)
        this.auraPhase += deltaTime * 0.003;
        this.auraIntensity = 0.4 + Math.sin(this.auraPhase) * 0.3;
        
        // Вращающийся нимб/корона
        this.haloAngle += deltaTime * 0.002;
        
        // Кувырок каждые 3-4 секунды
        this.flipTimer += deltaTime;
        if (!this.flipActive && this.flipTimer > 3000 + Math.random() * 1000) {
            this.flipActive = true;
            this.flipAngle = 0;
            this.flipTimer = 0;
        }
        if (this.flipActive) {
            this.flipAngle += deltaTime * 0.015;
            if (this.flipAngle >= Math.PI * 2) {
                this.flipActive = false;
                this.flipAngle = 0;
                // Разлёт 15-20 частиц
                const count = 15 + Math.floor(Math.random() * 6);
                for (let i = 0; i < count; i++) {
                    if (this.particles.length >= this.maxParticles) break;
                    const angle = (Math.PI * 2 / count) * i;
                    const speed = 2 + Math.random() * 3;
                    this.particles.push({
                        x: px,
                        y: py,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 700 + Math.random() * 300,
                        maxLife: 900,
                        size: 3 + Math.random() * 3,
                        alpha: 1,
                        gravity: 0.05,
                        shrink: 0.97,
                        color: isFire ? ['#ff4400', '#ff8800', '#ffcc00'][Math.floor(Math.random() * 3)]
                                      : ['#80deea', '#b3e5fc', '#ffffff'][Math.floor(Math.random() * 3)],
                        type: 'spark'
                    });
                }
            }
        }
        
        // Дорожка при ходьбе (огонь/лёд, светится 1.5с)
        if (isMoving && Math.random() < 0.6) {
            if (this.trailParticles.length < this.maxTrailParticles) {
                this.trailParticles.push({
                    x: px + (Math.random() - 0.5) * 8,
                    y: py + 12 + (Math.random() - 0.5) * 4,
                    life: 1500,
                    maxLife: 1500,
                    size: 4 + Math.random() * 3,
                    alpha: 1,
                    shrink: 0.997,
                    color: isFire ? '#ff6600' : '#4dd0e1',
                    type: 'trail_glow'
                });
            }
        }
        
        // Частицы у лапок при шаге
        if (isMoving && Math.random() < 0.5) {
            if (this.particles.length < this.maxParticles) {
                this.particles.push({
                    x: px + (Math.random() - 0.5) * 12,
                    y: py + 14,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -0.5 - Math.random(),
                    life: 400,
                    maxLife: 400,
                    size: 2 + Math.random() * 2,
                    alpha: 1,
                    gravity: 0.03,
                    color: isFire ? '#ffcc00' : '#e0f7fa',
                    type: 'spark'
                });
            }
        }
    }



    // =======================================================================
    // ГРУППА 4: Скины за 3000 кристаллов (Призрачный воин, Космический рейнджер)
    // Шлейф 15-20 частиц + два магических кольца + взлёт каждые 10с + буст при кристалле
    // =======================================================================
    _updateTier4(deltaTime, px, py, isMoving, skin, player) {
        // Инициализация колец
        if (this.rings.length === 0) {
            this.rings.push({
                angle: 0,
                speed: 1.2,
                tilt: 0.3,
                radius: 22,
                color: skin.glowColor
            });
            this.rings.push({
                angle: Math.PI,
                speed: -0.8,
                tilt: -0.5,
                radius: 26,
                color: skin.effect === 'ghost' ? '#82b1ff' : '#448aff'
            });
        }
        // Обновление колец
        for (const ring of this.rings) {
            ring.angle += ring.speed * (deltaTime / 1000);
        }
        
        // Постоянный шлейф (15-20 частиц)
        if (Math.random() < 0.7) {
            if (this.trailParticles.length < this.maxTrailParticles) {
                // Из хвоста и лапок
                const fromTail = Math.random() < 0.6;
                this.trailParticles.push({
                    x: fromTail ? px - 12 + (Math.random() - 0.5) * 6 : px + (Math.random() - 0.5) * 14,
                    y: fromTail ? py + 3 : py + 12,
                    life: 1000 + Math.random() * 500,
                    maxLife: 1200,
                    size: 2 + Math.random() * 3,
                    alpha: 1,
                    shrink: 0.995,
                    color: skin.glowColor,
                    gradient: true // Градиент яркости
                });
            }
        }
        
        // Взлёт каждые 10 секунд
        this.flyTimer += deltaTime;
        if (!this.flyActive && this.flyTimer > 10000) {
            this.flyActive = true;
            this.flyOffset = 0;
            this.flyTimer = 0;
        }
        if (this.flyActive) {
            // Взлёт + оборот + волна энергии
            this.flyOffset += deltaTime * 0.02;
            if (this.flyOffset >= Math.PI) {
                this.flyActive = false;
                this.flyOffset = 0;
                // Волна энергии (расширяющееся кольцо)
                this.particles.push({
                    x: px,
                    y: py,
                    vx: 0,
                    vy: 0,
                    life: 800,
                    maxLife: 800,
                    size: 5,
                    alpha: 1,
                    color: skin.glowColor,
                    type: 'energy_wave',
                    expandSpeed: 3
                });
            }
        }
        
        // Буст при сборе кристалла
        if (this.crystalBoostActive) {
            this.crystalBoostTimer -= deltaTime;
            if (this.crystalBoostTimer <= 0) {
                this.crystalBoostActive = false;
            }
        }
    }

    // =======================================================================
    // ГРУППА 5: Скины за 10000 кристаллов (Король теней, Создатель звёзд)
    // Максимальная зрелищность — уникальные комплексные эффекты
    // =======================================================================
    _updateTier5(deltaTime, px, py, isMoving, skin, player) {
        if (skin.effect === 'shadow_king') {
            this._updateShadowKing(deltaTime, px, py, isMoving);
        } else if (skin.effect === 'galaxy') {
            this._updateStarCreator(deltaTime, px, py, isMoving);
        }
    }

    // --- Король теней ---
    _updateShadowKing(deltaTime, px, py, isMoving) {
        // Обновление щупалец (они извиваются)
        for (const t of this.tentacles) {
            t.phase += t.speed * (deltaTime / 1000);
        }
        
        // Вороны-частицы каждые 4-6 секунд
        this.crowTimer += deltaTime;
        if (this.crowTimer > 4000 + Math.random() * 2000) {
            this.crowTimer = 0;
            const count = 5 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                if (this.particles.length >= this.maxParticles) break;
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 2.5;
                this.particles.push({
                    x: px,
                    y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    life: 1200 + Math.random() * 500,
                    maxLife: 1500,
                    size: 4 + Math.random() * 3,
                    alpha: 1,
                    gravity: -0.02,
                    shrink: 0.99,
                    color: '#2c003e',
                    type: 'crow'
                });
            }
        }
        
        // Крылья когда стоит (каждые 6 секунд)
        this.wingsTimer += deltaTime;
        if (!isMoving && !this.wingsActive && this.wingsTimer > 6000) {
            this.wingsActive = true;
            this.wingsAlpha = 0;
            this.wingsTimer = 0;
        }
        if (this.wingsActive) {
            this.wingsAlpha += deltaTime * 0.003;
            if (this.wingsAlpha >= 1.5) { // Появляются и исчезают
                this.wingsActive = false;
                this.wingsAlpha = 0;
            }
        }
        
        // Постоянная аура тьмы
        this.auraPhase += deltaTime * 0.002;
        
        // Фиолетовые всполохи
        if (Math.random() < 0.15) {
            if (this.particles.length < this.maxParticles) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 15 + Math.random() * 10;
                this.particles.push({
                    x: px + Math.cos(angle) * dist,
                    y: py + Math.sin(angle) * dist,
                    vx: 0,
                    vy: -0.3,
                    life: 500,
                    maxLife: 500,
                    size: 2 + Math.random() * 3,
                    alpha: 1,
                    color: '#9c27b0',
                    type: 'flicker'
                });
            }
        }
        
        // Шлейф при движении
        if (isMoving && Math.random() < 0.7) {
            if (this.trailParticles.length < this.maxTrailParticles) {
                this.trailParticles.push({
                    x: px + (Math.random() - 0.5) * 10,
                    y: py + (Math.random() - 0.5) * 10,
                    life: 1000,
                    maxLife: 1000,
                    size: 3 + Math.random() * 3,
                    alpha: 1,
                    shrink: 0.995,
                    color: '#4a0072'
                });
            }
        }
    }

    // --- Создатель звёзд ---
    _updateStarCreator(deltaTime, px, py, isMoving) {
        // Вращение галактики внутри
        this.galaxyAngle += deltaTime * 0.001;
        
        // Созвездие вращается
        this.constellationAngle += deltaTime * 0.0005;
        
        // Постоянный вылет звёздочек (2-3 в секунду)
        if (Math.random() < 0.05) {
            if (this.particles.length < this.maxParticles) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.3 + Math.random() * 0.8;
                this.particles.push({
                    x: px + (Math.random() - 0.5) * 10,
                    y: py + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 2000 + Math.random() * 1000,
                    maxLife: 2500,
                    size: 2 + Math.random() * 3,
                    alpha: 1,
                    shrink: 0.998,
                    color: ['#ffd700', '#ffffff', '#87ceeb', '#ff69b4'][Math.floor(Math.random() * 4)],
                    type: 'star_particle'
                });
            }
        }
        
        // Волна звёздной пыли каждые 8 секунд
        this.starWaveTimer += deltaTime;
        if (!this.starWaveActive && this.starWaveTimer > 8000) {
            this.starWaveActive = true;
            this.starWaveRadius = 0;
            this.starWaveTimer = 0;
        }
        if (this.starWaveActive) {
            this.starWaveRadius += deltaTime * 0.15;
            if (this.starWaveRadius > 150) {
                this.starWaveActive = false;
                this.starWaveRadius = 0;
            }
        }
        
        // Млечный Путь при движении
        if (isMoving && Math.random() < 0.8) {
            if (this.trailParticles.length < this.maxTrailParticles) {
                this.trailParticles.push({
                    x: px + (Math.random() - 0.5) * 12,
                    y: py + (Math.random() - 0.5) * 12,
                    life: 1500,
                    maxLife: 1500,
                    size: 1.5 + Math.random() * 2.5,
                    alpha: 1,
                    shrink: 0.997,
                    color: ['#ffd700', '#ffffff', '#87ceeb'][Math.floor(Math.random() * 3)]
                });
            }
        }
    }

    // Сигнал о сборе кристалла (усиление для тир 4)
    onCrystalCollected() {
        this.crystalBoostActive = true;
        this.crystalBoostTimer = 2000;
    }

    // Сброс при смене скина или уровня
    reset() {
        this.particles = [];
        this.trailParticles = [];
        this.orbitParticles = [];
        this.rings = [];
        this.specialTimer = 0;
        this.flipTimer = 0;
        this.flipActive = false;
        this.flyTimer = 0;
        this.flyActive = false;
        this.wingsTimer = 0;
        this.wingsActive = false;
        this.crowTimer = 0;
        this.starWaveTimer = 0;
        this.starWaveActive = false;
        this.crystalBoostActive = false;
        this._initTentacles();
    }



    // =======================================================================
    // ОТРИСОВКА — вызывается из renderer.js
    // =======================================================================
    render(ctx, offsetX, offsetY, player, skin, time) {
        if (!skin) return;
        
        const cs = player.cellSize;
        const emotionJump = player.emotionJumpOffset || 0;
        const px = offsetX + player.pixelX + cs / 2;
        const py = offsetY + player.pixelY + cs / 2 - player.bounceOffset - emotionJump;
        const drawY = player.isVictory ? py - player.victoryJump : py;
        const size = cs * 0.35;
        const tier = skin.tier;

        ctx.save();

        // === Отрисовка по тиру ===
        switch (tier) {
            case 1: this._renderTier1(ctx, px, drawY, size, skin, time); break;
            case 2: this._renderTier2(ctx, px, drawY, size, skin, time); break;
            case 3: this._renderTier3(ctx, px, drawY, size, skin, time); break;
            case 4: this._renderTier4(ctx, px, drawY, size, skin, time); break;
            case 5:
                if (skin.effect === 'shadow_king') {
                    this._renderShadowKing(ctx, px, drawY, size, skin, time);
                } else {
                    this._renderStarCreator(ctx, px, drawY, size, skin, time);
                }
                break;
        }

        // === Общая отрисовка частиц ===
        this._renderTrail(ctx, offsetX, offsetY);
        this._renderParticles(ctx, offsetX, offsetY);

        ctx.restore();
    }

    // --- Тир 1: Сияние контура ---
    _renderTier1(ctx, px, py, size, skin, time) {
        // Мягкое переливающееся сияние по контуру
        const hue = Math.sin(time * 0.002) * 0.5 + 0.5; // 0-1
        const r = Math.floor(255 * hue);
        const g = Math.floor(200 + 55 * (1 - hue));
        const b = Math.floor(50);
        
        ctx.shadowColor = skin.glowColor;
        ctx.shadowBlur = 6 + Math.sin(time * 0.004) * 3;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + Math.sin(time * 0.003) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px, py, size + 2, size * 1.1 + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // --- Тир 2: Орбитальные частицы ---
    _renderTier2(ctx, px, py, size, skin, time) {
        // Сияние
        ctx.shadowColor = skin.glowColor;
        ctx.shadowBlur = 5 + Math.sin(time * 0.003) * 2;
        ctx.strokeStyle = `${skin.glowColor}66`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py, size + 3, size * 1.1 + 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Орбитальные частицы
        for (const orb of this.orbitParticles) {
            const ox = px + Math.cos(orb.angle) * orb.radiusX;
            const oy = py + Math.sin(orb.angle) * orb.radiusY + Math.sin(orb.wobble) * 3;
            
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = orb.color;
            
            if (orb.type === 'leaf') {
                // Листик
                ctx.save();
                ctx.translate(ox, oy);
                ctx.rotate(orb.angle);
                ctx.beginPath();
                ctx.ellipse(0, 0, orb.size, orb.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Монетка (кружок с бликом)
                ctx.beginPath();
                ctx.arc(ox, oy, orb.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(ox - 1, oy - 1, orb.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // --- Тир 3: Аура + нимб ---
    _renderTier3(ctx, px, py, size, skin, time) {
        const isFire = skin.effect === 'fire';
        
        // Пульсирующая аура
        const auraSize = size * 1.8 + Math.sin(this.auraPhase) * 5;
        const grad = ctx.createRadialGradient(px, py, size * 0.5, px, py, auraSize);
        if (isFire) {
            grad.addColorStop(0, `rgba(255, 100, 0, ${this.auraIntensity * 0.4})`);
            grad.addColorStop(0.6, `rgba(255, 60, 0, ${this.auraIntensity * 0.2})`);
            grad.addColorStop(1, 'rgba(255, 30, 0, 0)');
        } else {
            grad.addColorStop(0, `rgba(77, 208, 225, ${this.auraIntensity * 0.4})`);
            grad.addColorStop(0.6, `rgba(0, 188, 212, ${this.auraIntensity * 0.2})`);
            grad.addColorStop(1, 'rgba(0, 150, 167, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, auraSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Нимб/корона элемента над головой
        const haloY = py - size * 1.5;
        ctx.globalAlpha = 0.7;
        if (isFire) {
            // Огненный нимб
            for (let i = 0; i < 8; i++) {
                const a = this.haloAngle + (Math.PI * 2 / 8) * i;
                const hx = px + Math.cos(a) * 8;
                const hy = haloY + Math.sin(a) * 3;
                ctx.fillStyle = ['#ff4400', '#ff8800', '#ffcc00'][i % 3];
                ctx.beginPath();
                ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Ледяная корона
            for (let i = 0; i < 6; i++) {
                const a = this.haloAngle + (Math.PI * 2 / 6) * i;
                const hx = px + Math.cos(a) * 9;
                const hy = haloY + Math.sin(a) * 3;
                ctx.fillStyle = '#80deea';
                ctx.beginPath();
                ctx.moveTo(hx, hy - 4);
                ctx.lineTo(hx + 2, hy + 2);
                ctx.lineTo(hx - 2, hy + 2);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        
        // Кувырок (вращение лисёнка)
        // Этот эффект применяется в renderer.js через flipAngle
    }

    // --- Тир 4: Кольца + туманности внутри ---
    _renderTier4(ctx, px, py, size, skin, time) {
        // Туманности/звёзды внутри тела
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(px, py, size, size * 1.1, 0, 0, Math.PI * 2);
        ctx.clip();
        
        const isGhost = skin.effect === 'ghost';
        for (let i = 0; i < 10; i++) {
            const sx = px + Math.sin(time * 0.0008 + i * 2.1) * size * 0.7;
            const sy = py + Math.cos(time * 0.001 + i * 1.7) * size * 0.9;
            ctx.fillStyle = isGhost ? 
                `rgba(130, 177, 255, ${0.3 + Math.sin(time * 0.003 + i) * 0.2})` :
                `rgba(68, 138, 255, ${0.3 + Math.sin(time * 0.003 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5 + Math.sin(time * 0.005 + i) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Два магических кольца
        for (const ring of this.rings) {
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ring.angle);
            ctx.scale(1, Math.abs(Math.sin(ring.angle * 0.5 + ring.tilt)) * 0.4 + 0.1);
            
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.6;
            ctx.shadowColor = ring.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Руны/пиксели на кольце
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i + ring.angle * 2;
                const rx = Math.cos(a) * ring.radius;
                const ry = Math.sin(a) * ring.radius;
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.8;
                ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
            }
            
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        
        // Волна энергии (от взлёта)
        for (const p of this.particles) {
            if (p.type === 'energy_wave') {
                const waveSize = p.size + (1 - p.alpha) * 80;
                ctx.strokeStyle = skin.glowColor;
                ctx.lineWidth = 2 * p.alpha;
                ctx.globalAlpha = p.alpha * 0.6;
                ctx.beginPath();
                ctx.arc(px, py, waveSize, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        
        // Буст при кристалле — кольца ярче
        if (this.crystalBoostActive) {
            ctx.shadowColor = skin.glowColor;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = skin.glowColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 * (this.crystalBoostTimer / 2000);
            ctx.beginPath();
            ctx.arc(px, py, size * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }

    // --- Король теней ---
    _renderShadowKing(ctx, px, py, size, skin, time) {
        // Аура тьмы
        const darkAura = size * 2.5 + Math.sin(this.auraPhase) * 5;
        const grad = ctx.createRadialGradient(px, py, size, px, py, darkAura);
        grad.addColorStop(0, 'rgba(26, 0, 51, 0.5)');
        grad.addColorStop(0.5, 'rgba(75, 0, 130, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, darkAura, 0, Math.PI * 2);
        ctx.fill();
        
        // Щупальца теней
        for (const t of this.tentacles) {
            const angle = t.baseAngle + Math.sin(t.phase) * 0.5;
            ctx.strokeStyle = 'rgba(75, 0, 130, 0.6)';
            ctx.lineWidth = t.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(px, py);
            
            // Изгиб щупальца через bezier
            const midX = px + Math.cos(angle) * t.length * 0.5 + Math.sin(t.phase * 2) * 5;
            const midY = py + Math.sin(angle) * t.length * 0.5 + Math.cos(t.phase * 1.5) * 5;
            const endX = px + Math.cos(angle) * t.length + Math.sin(t.phase * 3) * 3;
            const endY = py + Math.sin(angle) * t.length + Math.cos(t.phase * 2) * 3;
            
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
        }
        
        // Тёмные крылья (когда стоит)
        if (this.wingsActive) {
            const alpha = this.wingsAlpha < 1 ? this.wingsAlpha : 2 - this.wingsAlpha;
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = '#1a0033';
            ctx.shadowColor = '#9c27b0';
            ctx.shadowBlur = 10;
            
            // Три крыла-веера
            for (let w = -1; w <= 1; w++) {
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(w * 0.6);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-size * 0.5, -size * 2, 0, -size * 2.5);
                ctx.quadraticCurveTo(size * 0.5, -size * 2, 0, 0);
                ctx.fill();
                ctx.restore();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        
        // Фиолетовые всполохи (рендерятся через общие частицы)
    }

    // --- Создатель звёзд ---
    _renderStarCreator(ctx, px, py, size, skin, time) {
        // Спиральная туманность внутри силуэта
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(px, py, size * 1.1, size * 1.2, 0, 0, Math.PI * 2);
        ctx.clip();
        
        // Спиральные рукава
        for (let arm = 0; arm < 3; arm++) {
            const baseAngle = this.galaxyAngle + arm * Math.PI * 2 / 3;
            ctx.strokeStyle = ['rgba(255, 215, 0, 0.6)', 'rgba(135, 206, 235, 0.5)', 'rgba(255, 105, 180, 0.5)'][arm];
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let j = 0; j < 15; j++) {
                const dist = j * size * 0.08;
                const angle = baseAngle + j * 0.4;
                const sx = px + Math.cos(angle) * dist;
                const sy = py + Math.sin(angle) * dist;
                if (j === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
            
            // Точки на рукавах
            for (let j = 0; j < 8; j++) {
                const dist = j * size * 0.12;
                const angle = baseAngle + j * 0.4;
                const sx = px + Math.cos(angle) * dist;
                const sy = py + Math.sin(angle) * dist;
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.5 + Math.sin(time * 0.005 + j + arm) * 0.3;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        
        // Созвездие над головой (5 ярких точек, соединённых линиями)
        const consY = py - size * 1.8;
        const consPoints = [];
        for (let i = 0; i < 5; i++) {
            const a = this.constellationAngle + (Math.PI * 2 / 5) * i;
            consPoints.push({
                x: px + Math.cos(a) * 10,
                y: consY + Math.sin(a) * 5
            });
        }
        
        // Линии созвездия
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < consPoints.length; i++) {
            const next = (i + 1) % consPoints.length;
            ctx.moveTo(consPoints[i].x, consPoints[i].y);
            ctx.lineTo(consPoints[next].x, consPoints[next].y);
        }
        ctx.stroke();
        
        // Яркие точки созвездия
        for (const p of consPoints) {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Волна звёздной пыли
        if (this.starWaveActive) {
            const alpha = 1 - this.starWaveRadius / 150;
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, this.starWaveRadius, -Math.PI * 0.3, Math.PI * 0.3);
            ctx.stroke();
            
            // Пыль вдоль дуги
            for (let i = 0; i < 5; i++) {
                const a = -Math.PI * 0.3 + (Math.PI * 0.6 / 5) * i;
                const sx = px + Math.cos(a) * this.starWaveRadius;
                const sy = py + Math.sin(a) * this.starWaveRadius;
                ctx.fillStyle = '#ffd700';
                ctx.globalAlpha = alpha * 0.7;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    // === Общая отрисовка шлейфа ===
    _renderTrail(ctx, offsetX, offsetY) {
        for (const p of this.trailParticles) {
            ctx.globalAlpha = p.alpha * 0.7;
            if (p.type === 'trail_glow') {
                // Светящийся след (огонь/лёд)
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 5;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(offsetX + p.x, offsetY + p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(offsetX + p.x, offsetY + p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // === Общая отрисовка частиц ===
    _renderParticles(ctx, offsetX, offsetY) {
        for (const p of this.particles) {
            if (p.type === 'energy_wave') continue; // Отрисовано отдельно
            
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            
            if (p.type === 'crow') {
                // Ворон — маленький треугольник-птица
                ctx.save();
                ctx.translate(offsetX + p.x, offsetY + p.y);
                ctx.rotate(Math.atan2(p.vy, p.vx));
                ctx.beginPath();
                ctx.moveTo(p.size, 0);
                ctx.lineTo(-p.size, -p.size * 0.5);
                ctx.lineTo(-p.size * 0.3, 0);
                ctx.lineTo(-p.size, p.size * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'star_particle') {
                // Маленькая звёздочка
                ctx.save();
                ctx.translate(offsetX + p.x, offsetY + p.y);
                this._drawMiniStar(ctx, 0, 0, p.size, 4);
                ctx.restore();
            } else if (p.type === 'flash_small') {
                // Маленькая вспышка
                const grad = ctx.createRadialGradient(
                    offsetX + p.x, offsetY + p.y, 0,
                    offsetX + p.x, offsetY + p.y, p.size
                );
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(offsetX + p.x, offsetY + p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Обычная круглая частица
                ctx.beginPath();
                ctx.arc(offsetX + p.x, offsetY + p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // Вспомогательная: мини-звезда
    _drawMiniStar(ctx, cx, cy, size, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const r = i % 2 === 0 ? size : size * 0.4;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Получить угол кувырка (для renderer.js)
    getFlipAngle() {
        return this.flipActive ? this.flipAngle : 0;
    }

    // Получить смещение полёта (для тир 4)
    getFlyOffset() {
        return this.flyActive ? Math.sin(this.flyOffset) * 15 : 0;
    }
}
