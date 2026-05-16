// Файл: magic-maze/js/animations.js
// Система анимаций и частиц — ОПТИМИЗИРОВАНО
// Жёсткий лимит частиц: 60 (по ТЗ).
// Светлячков на уровне: 3, движение по синусоиде, без сложной логики.
// Используется ПУЛ объектов: при превышении лимита вытесняем самые старые,
// но сами объекты-частицы переиспользуются (минимум аллокаций GC).

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.fireflies = [];
        this.screenEffects = [];
        this.textPopups = [];
        // Жёсткий лимит активных частиц (по ТЗ — 60).
        this.MAX_PARTICLES = 60;
        // Пул переиспользуемых частиц для снижения нагрузки на GC.
        this._pool = [];
        this._initFireflies();
    }

    // Получить готовый объект частицы из пула (или создать новый)
    _acquire() {
        return this._pool.pop() || {};
    }

    // Вернуть частицу в пул
    _release(p) {
        if (this._pool.length < 128) this._pool.push(p);
    }

    // 3 светлячка — простая синусоида, без сложной анимации (по ТЗ)
    _initFireflies() {
        this.fireflies = [];
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.fireflies.push({
                // baseX/baseY — точка, вокруг которой светлячок колеблется по синусу
                baseX: 80 + i * 160,
                baseY: 200 + (i * 90) % 300,
                ampX: 30 + Math.random() * 20,
                ampY: 20 + Math.random() * 15,
                x: 0, y: 0,
                phase: Math.random() * Math.PI * 2,
                speed: 0.0008 + Math.random() * 0.0006,
                size: 4 + Math.random() * 3,
                brightness: 0
            });
        }
    }

    // Обновить все частицы
    update(deltaTime) {
        // Светлячки — простое движение по синусоиде вокруг базовой точки.
        // Без накопления скоростей и отскоков — это в разы дешевле.
        for (const ff of this.fireflies) {
            ff.phase += deltaTime * ff.speed;
            ff.brightness = 0.3 + Math.sin(ff.phase * 1.7) * 0.7;
            ff.x = ff.baseX + Math.sin(ff.phase) * ff.ampX;
            ff.y = ff.baseY + Math.cos(ff.phase * 0.8) * ff.ampY;
        }

        // Обновление частиц (с возвратом в пул)
        const dt16 = deltaTime / 16;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;
            p.x += p.vx * dt16;
            p.y += p.vy * dt16;
            p.vy += (p.gravity || 0) * dt16;
            p.alpha = Math.max(0, p.life / p.maxLife);
            p.size *= p.shrink || 0.99;

            if (p.rotation !== undefined) {
                p.rotation += p.rotationSpeed * dt16;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                this._release(p);
            }
        }

        // Экранные эффекты
        for (let i = this.screenEffects.length - 1; i >= 0; i--) {
            const effect = this.screenEffects[i];
            effect.life -= deltaTime;
            effect.alpha = effect.life / effect.maxLife;
            if (effect.life <= 0) this.screenEffects.splice(i, 1);
        }

        // Текстовые всплывашки
        for (let i = this.textPopups.length - 1; i >= 0; i--) {
            const popup = this.textPopups[i];
            popup.life -= deltaTime;
            popup.y -= deltaTime * 0.03;
            popup.alpha = popup.life / popup.maxLife;
            popup.scale = 1 + (1 - popup.alpha) * 0.3;
            if (popup.life <= 0) this.textPopups.splice(i, 1);
        }
    }

    // Добавить частицу с проверкой лимита (через пул)
    _addParticle(p) {
        if (this.particles.length >= this.MAX_PARTICLES) {
            // При превышении лимита — переиспользуем самую старую частицу.
            const old = this.particles.shift();
            // Копируем поля без новой аллокации
            Object.assign(old, p);
            this.particles.push(old);
            return;
        }
        // Берём из пула, чтобы не создавать новый объект
        const slot = this._acquire();
        Object.assign(slot, p);
        this.particles.push(slot);
    }

    // === ЭФФЕКТЫ СБОРА КРИСТАЛЛА ===
    emitCrystalCollect(x, y) {
        const count = Math.min(GAME_CONSTANTS.ANIMATIONS.CRYSTAL_PARTICLES, 8); // Уменьшено с 12 до 8
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 2 + Math.random() * 3;
            this._addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 600, maxLife: 600,
                size: 3 + Math.random() * 3,
                color: this._randomCrystalColor(),
                alpha: 1, gravity: 0.1, shrink: 0.97,
                type: 'star'
            });
        }
        // Вспышка света
        this._addParticle({
            x, y, vx: 0, vy: 0,
            life: 250, maxLife: 250,
            size: 25, color: '#ffffff',
            alpha: 1, gravity: 0, shrink: 1.05,
            type: 'flash'
        });
    }

    // === ЭФФЕКТ ПОЛУЧЕНИЯ УРОНА ===
    emitDamage(x, y) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2.5;
            this._addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 500, maxLife: 500,
                size: 3 + Math.random() * 3,
                color: GAME_CONSTANTS.COLORS.PARTICLE_ORANGE,
                alpha: 1, gravity: 0.05, shrink: 0.98,
                type: 'circle'
            });
        }
        this.screenEffects.push({
            type: 'damage',
            color: GAME_CONSTANTS.COLORS.DAMAGE_RED,
            life: 400, maxLife: 400, alpha: 1
        });
    }

    // === ЭФФЕКТ СБОРА УСИЛЕНИЯ ===
    emitPowerCollect(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const colors = [color, '#ffffff', '#ff69b4', '#87ceeb', '#98fb98'];
            this._addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 600, maxLife: 600,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1, gravity: 0.08, shrink: 0.96,
                type: 'circle'
            });
        }
    }

    // === ЭФФЕКТ ЗАВЕРШЕНИЯ УРОВНЯ ===
    emitLevelComplete(canvasWidth, canvasHeight) {
        const count = 20; // Уменьшено с 35
        const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff', '#ff00ff', '#ffd700'];

        for (let i = 0; i < count; i++) {
            const startX = canvasWidth / 2 + (Math.random() - 0.5) * 80;
            const startY = canvasHeight / 2;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 3 + Math.random() * 6;

            this._addParticle({
                x: startX, y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1500 + Math.random() * 800,
                maxLife: 2000,
                size: 4 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1, gravity: 0.12, shrink: 0.995,
                type: 'star',
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }

        this.screenEffects.push({
            type: 'gold',
            color: GAME_CONSTANTS.COLORS.LEVEL_GOLD,
            life: 600, maxLife: 600, alpha: 1
        });
    }

    // === ЭФФЕКТ ПОРТАЛА ===
    emitPortalEntry(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const radius = 25 + Math.random() * 15;
            this._addParticle({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
                vx: -Math.cos(angle) * 2,
                vy: -Math.sin(angle) * 2,
                life: 800, maxLife: 800,
                size: 3 + Math.random() * 3,
                color: GAME_CONSTANTS.COLORS.PORTAL_SECONDARY,
                alpha: 1, gravity: 0, shrink: 0.95,
                type: 'circle'
            });
        }
        this.screenEffects.push({
            type: 'white',
            color: 'rgba(255, 255, 255, 0.8)',
            life: 500, maxLife: 500, alpha: 1
        });
    }

    // === ТЕКСТОВАЯ ВСПЛЫВАШКА ===
    addTextPopup(x, y, text, color = '#ffffff', size = 20) {
        this.textPopups.push({
            x, y, text, color, size,
            life: 1200, maxLife: 1200,
            alpha: 1, scale: 1
        });
    }

    // === ЭФФЕКТ ПОДПРЫГИВАНИЯ СЧЁТА ===
    emitScoreBounce(x, y) {
        this._addParticle({
            x, y, vx: 0, vy: -1,
            life: 300, maxLife: 300,
            size: 8, color: GAME_CONSTANTS.COLORS.UI_SCORE,
            alpha: 1, gravity: 0, shrink: 1.02,
            type: 'flash'
        });
    }

    // Вспомогательные методы
    _randomCrystalColor() {
        const colors = [
            GAME_CONSTANTS.COLORS.CRYSTAL_BLUE,
            GAME_CONSTANTS.COLORS.CRYSTAL_PINK,
            GAME_CONSTANTS.COLORS.CRYSTAL_GREEN,
            GAME_CONSTANTS.COLORS.CRYSTAL_GLOW
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Очистить все частицы
    clear() {
        this.particles = [];
        this.screenEffects = [];
        this.textPopups = [];
    }
}
