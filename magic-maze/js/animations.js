// Файл: magic-maze/js/animations.js
// Система анимаций и частиц — ОПТИМИЗИРОВАНО
// Лимит фоновых частиц: 4 светлячка (крупные), общий лимит 80 частиц

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.fireflies = [];
        this.screenEffects = [];
        this.textPopups = [];
        // Глобальный лимит активных частиц
        this.MAX_PARTICLES = 80;
        // Инициализация светлячков (3-5 штук, крупнее)
        this._initFireflies();
    }

    // Создать фоновых светлячков (уменьшено до 4, увеличен размер)
    _initFireflies() {
        this.fireflies = [];
        const count = 4; // Было 8, теперь 4
        for (let i = 0; i < count; i++) {
            this.fireflies.push({
                x: Math.random() * 500,
                y: Math.random() * 700,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                phase: Math.random() * Math.PI * 2,
                size: 4 + Math.random() * 4, // Крупнее (было 2-5, теперь 4-8)
                brightness: 0
            });
        }
    }

    // Обновить все частицы
    update(deltaTime) {
        // Обновление светлячков
        for (const ff of this.fireflies) {
            ff.phase += deltaTime * 0.0015;
            ff.brightness = 0.3 + Math.sin(ff.phase) * 0.7;
            ff.x += ff.vx * (deltaTime / 16);
            ff.y += ff.vy * (deltaTime / 16);

            // Мягкий отскок от краёв
            if (ff.x < 0 || ff.x > 500) ff.vx *= -1;
            if (ff.y < 0 || ff.y > 700) ff.vy *= -1;

            // Редкое изменение направления
            if (Math.random() < 0.01) {
                ff.vx += (Math.random() - 0.5) * 0.05;
                ff.vy += (Math.random() - 0.5) * 0.05;
            }
            ff.vx = Math.max(-0.3, Math.min(0.3, ff.vx));
            ff.vy = Math.max(-0.3, Math.min(0.3, ff.vy));
        }

        // Обновление частиц
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            p.vy += (p.gravity || 0) * (deltaTime / 16);
            p.alpha = Math.max(0, p.life / p.maxLife);
            p.size *= p.shrink || 0.99;

            if (p.rotation !== undefined) {
                p.rotation += p.rotationSpeed * (deltaTime / 16);
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Обновление экранных эффектов
        for (let i = this.screenEffects.length - 1; i >= 0; i--) {
            const effect = this.screenEffects[i];
            effect.life -= deltaTime;
            effect.alpha = effect.life / effect.maxLife;
            if (effect.life <= 0) {
                this.screenEffects.splice(i, 1);
            }
        }

        // Обновление текстовых всплывашек
        for (let i = this.textPopups.length - 1; i >= 0; i--) {
            const popup = this.textPopups[i];
            popup.life -= deltaTime;
            popup.y -= deltaTime * 0.03;
            popup.alpha = popup.life / popup.maxLife;
            popup.scale = 1 + (1 - popup.alpha) * 0.3;
            if (popup.life <= 0) {
                this.textPopups.splice(i, 1);
            }
        }
    }

    // Добавить частицу с проверкой лимита
    _addParticle(p) {
        if (this.particles.length >= this.MAX_PARTICLES) {
            // Удаляем самую старую частицу
            this.particles.shift();
        }
        this.particles.push(p);
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
