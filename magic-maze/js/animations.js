// Файл: magic-maze/js/animations.js
// Система анимаций и частиц: светлячки, взрывы, эффекты

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.fireflies = [];
        this.screenEffects = [];
        this.textPopups = [];
        
        // Инициализация светлячков
        this._initFireflies();
    }

    // Создать фоновых светлячков
    _initFireflies() {
        this.fireflies = [];
        for (let i = 0; i < GAME_CONSTANTS.ANIMATIONS.FIREFLY_COUNT; i++) {
            this.fireflies.push({
                x: Math.random() * 500,
                y: Math.random() * 700,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                phase: Math.random() * Math.PI * 2,
                size: 2 + Math.random() * 3,
                brightness: 0
            });
        }
    }

    // Обновить все частицы
    update(deltaTime) {
        // Обновление светлячков
        for (const ff of this.fireflies) {
            ff.phase += deltaTime * 0.002;
            ff.brightness = 0.3 + Math.sin(ff.phase) * 0.7;
            ff.x += ff.vx;
            ff.y += ff.vy;
            
            // Мягкий отскок от краёв
            if (ff.x < 0 || ff.x > 500) ff.vx *= -1;
            if (ff.y < 0 || ff.y > 700) ff.vy *= -1;
            
            // Небольшое случайное изменение направления
            ff.vx += (Math.random() - 0.5) * 0.02;
            ff.vy += (Math.random() - 0.5) * 0.02;
            ff.vx = Math.max(-0.5, Math.min(0.5, ff.vx));
            ff.vy = Math.max(-0.5, Math.min(0.5, ff.vy));
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

    // === ЭФФЕКТЫ СБОРА КРИСТАЛЛА ===
    emitCrystalCollect(x, y) {
        const count = GAME_CONSTANTS.ANIMATIONS.CRYSTAL_PARTICLES;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 800,
                maxLife: 800,
                size: 3 + Math.random() * 4,
                color: this._randomCrystalColor(),
                alpha: 1,
                gravity: 0.1,
                shrink: 0.97,
                type: 'star'
            });
        }
        
        // Вспышка света
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 300,
            maxLife: 300,
            size: 30,
            color: '#ffffff',
            alpha: 1,
            gravity: 0,
            shrink: 1.05,
            type: 'flash'
        });
    }

    // === ЭФФЕКТ ПОЛУЧЕНИЯ УРОНА ===
    emitDamage(x, y) {
        // Оранжевые пушинки
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 600,
                maxLife: 600,
                size: 4 + Math.random() * 4,
                color: GAME_CONSTANTS.COLORS.PARTICLE_ORANGE,
                alpha: 1,
                gravity: 0.05,
                shrink: 0.98,
                type: 'circle'
            });
        }
        
        // Красный экранный эффект
        this.screenEffects.push({
            type: 'damage',
            color: GAME_CONSTANTS.COLORS.DAMAGE_RED,
            life: 500,
            maxLife: 500,
            alpha: 1
        });
    }

    // === ЭФФЕКТ СБОРА УСИЛЕНИЯ ===
    emitPowerCollect(x, y, color) {
        // Радужные брызги (лопающийся пузырь)
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            const colors = [color, '#ffffff', '#ff69b4', '#87ceeb', '#98fb98'];
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 700,
                maxLife: 700,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                gravity: 0.08,
                shrink: 0.96,
                type: 'circle'
            });
        }
    }

    // === ЭФФЕКТ ЗАВЕРШЕНИЯ УРОВНЯ ===
    emitLevelComplete(canvasWidth, canvasHeight) {
        const count = GAME_CONSTANTS.ANIMATIONS.LEVEL_COMPLETE_PARTICLES;
        const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff', '#ff00ff', '#ffd700'];
        
        for (let i = 0; i < count; i++) {
            const startX = canvasWidth / 2 + (Math.random() - 0.5) * 100;
            const startY = canvasHeight / 2;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 3 + Math.random() * 8;
            
            this.particles.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 2000 + Math.random() * 1000,
                maxLife: 2500,
                size: 4 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                gravity: 0.12,
                shrink: 0.995,
                type: 'star',
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
        
        // Золотая вспышка экрана
        this.screenEffects.push({
            type: 'gold',
            color: GAME_CONSTANTS.COLORS.LEVEL_GOLD,
            life: 800,
            maxLife: 800,
            alpha: 1
        });
    }

    // === ЭФФЕКТ ПОРТАЛА ===
    emitPortalEntry(x, y) {
        // Спиральные частицы
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const radius = 30 + Math.random() * 20;
            this.particles.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
                vx: -Math.cos(angle) * 2,
                vy: -Math.sin(angle) * 2,
                life: 1000,
                maxLife: 1000,
                size: 3 + Math.random() * 4,
                color: GAME_CONSTANTS.COLORS.PORTAL_SECONDARY,
                alpha: 1,
                gravity: 0,
                shrink: 0.95,
                type: 'circle'
            });
        }
        
        // Белая вспышка
        this.screenEffects.push({
            type: 'white',
            color: 'rgba(255, 255, 255, 0.8)',
            life: 600,
            maxLife: 600,
            alpha: 1
        });
    }

    // === ТЕКСТОВАЯ ВСПЛЫВАШКА ===
    addTextPopup(x, y, text, color = '#ffffff', size = 20) {
        this.textPopups.push({
            x: x,
            y: y,
            text: text,
            color: color,
            size: size,
            life: 1500,
            maxLife: 1500,
            alpha: 1,
            scale: 1
        });
    }

    // === ЭФФЕКТ ПОДПРЫГИВАНИЯ СЧЁТА ===
    emitScoreBounce(x, y) {
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: -1,
            life: 400,
            maxLife: 400,
            size: 8,
            color: GAME_CONSTANTS.COLORS.UI_SCORE,
            alpha: 1,
            gravity: 0,
            shrink: 1.02,
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
