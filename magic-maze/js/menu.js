// Файл: magic-maze/js/menu.js
// Полная переработка системы меню
// Управляет экранами: MENU, PAUSED, SHOP, GAMEOVER, LEVEL_COMPLETE
// Сказочная атмосфера, анимации, красивый дизайн

class MenuSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;

        // Фоновые элементы
        this.stars = [];
        this.nebulas = [];
        this.menuFireflies = [];
        this.floatingCrystals = [];
        this.fallingStars = [];
        this.forestSilhouette = [];

        // Анимации
        this.titlePhase = 0;
        this.foxyPhase = 0;
        this.foxyJump = 0;
        this.foxyWave = 0;
        this.buttonPressedId = -1;
        this.buttonPressScale = 1;
        this.transitionAlpha = 0;
        this.transitionDirection = 0; // 1 = fade in, -1 = fade out

        // Состояние
        this._initialized = false;

        this._initBackground();
    }

    // Инициализация фоновых элементов
    _initBackground() {
        // Звёзды (60 шт, маленькие мерцающие)
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * 500,
                y: Math.random() * 500,
                size: 0.5 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.5
            });
        }

        // Туманности (3 штуки, медленно плывут)
        const nebulaColors = ['rgba(88, 28, 135, 0.15)', 'rgba(30, 58, 138, 0.12)', 'rgba(180, 140, 50, 0.08)'];
        for (let i = 0; i < 3; i++) {
            this.nebulas.push({
                x: Math.random() * 500,
                y: 100 + Math.random() * 300,
                size: 120 + Math.random() * 100,
                color: nebulaColors[i],
                phase: Math.random() * Math.PI * 2,
                speed: 0.0002 + Math.random() * 0.0003
            });
        }

        // Светлячки меню (4 шт)
        for (let i = 0; i < 4; i++) {
            this.menuFireflies.push({
                x: Math.random() * 500,
                y: 100 + Math.random() * 400,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                phase: Math.random() * Math.PI * 2,
                size: 3 + Math.random() * 3
            });
        }

        // Парящие кристаллы (3 шт вокруг названия)
        for (let i = 0; i < 3; i++) {
            this.floatingCrystals.push({
                angle: (Math.PI * 2 / 3) * i,
                radius: 80 + Math.random() * 30,
                size: 6 + Math.random() * 4,
                speed: 0.0005 + Math.random() * 0.0003,
                color: ['#64b5f6', '#f48fb1', '#ffd700'][i]
            });
        }

        // Силуэт леса (волнистая линия внизу)
        for (let x = 0; x <= 500; x += 10) {
            const h = 30 + Math.sin(x * 0.03) * 15 + Math.sin(x * 0.07) * 8 + Math.random() * 5;
            this.forestSilhouette.push({ x, h });
        }

        this._initialized = true;
    }



    // === ОБНОВЛЕНИЕ ФОНА ===
    updateBackground(deltaTime) {
        const time = performance.now();

        // Туманности
        for (const n of this.nebulas) {
            n.phase += deltaTime * n.speed;
            n.x += Math.sin(n.phase) * 0.3;
            n.y += Math.cos(n.phase * 0.7) * 0.1;
        }

        // Светлячки
        for (const ff of this.menuFireflies) {
            ff.phase += deltaTime * 0.002;
            ff.x += ff.vx * (deltaTime / 16);
            ff.y += ff.vy * (deltaTime / 16);
            if (ff.x < 0 || ff.x > this.width) ff.vx *= -1;
            if (ff.y < 50 || ff.y > this.height - 100) ff.vy *= -1;
            if (Math.random() < 0.005) {
                ff.vx += (Math.random() - 0.5) * 0.05;
                ff.vy += (Math.random() - 0.5) * 0.05;
            }
        }

        // Кристаллы
        for (const c of this.floatingCrystals) {
            c.angle += deltaTime * c.speed;
        }

        // Анимации лисёнка
        this.titlePhase += deltaTime * 0.001;
        this.foxyPhase += deltaTime * 0.003;
        this.foxyWave += deltaTime * 0.005;

        // Прыжок лисёнка (периодический)
        if (Math.sin(this.foxyPhase * 0.5) > 0.95) {
            this.foxyJump = Math.max(0, this.foxyJump - deltaTime * 0.01);
        }
        if (Math.random() < 0.001) {
            this.foxyJump = 15;
        }

        // Падающие звёзды (редко)
        if (Math.random() < 0.003 && this.fallingStars.length < 2) {
            this.fallingStars.push({
                x: Math.random() * this.width,
                y: 0,
                vx: 2 + Math.random() * 3,
                vy: 3 + Math.random() * 4,
                life: 800,
                maxLife: 800,
                size: 2
            });
        }
        for (let i = this.fallingStars.length - 1; i >= 0; i--) {
            const s = this.fallingStars[i];
            s.x += s.vx * (deltaTime / 16);
            s.y += s.vy * (deltaTime / 16);
            s.life -= deltaTime;
            if (s.life <= 0) this.fallingStars.splice(i, 1);
        }

        // Анимация кнопки
        if (this.buttonPressedId >= 0) {
            this.buttonPressScale = Math.max(0.9, this.buttonPressScale - deltaTime * 0.005);
        } else {
            this.buttonPressScale = Math.min(1, this.buttonPressScale + deltaTime * 0.005);
        }

        // Переход
        if (this.transitionDirection !== 0) {
            this.transitionAlpha += this.transitionDirection * deltaTime * 0.003;
            if (this.transitionAlpha >= 1) {
                this.transitionAlpha = 1;
                this.transitionDirection = 0;
            }
            if (this.transitionAlpha <= 0) {
                this.transitionAlpha = 0;
                this.transitionDirection = 0;
            }
        }
    }

    // === ОТРИСОВКА АНИМИРОВАННОГО ФОНА ===
    _drawBackground() {
        const ctx = this.ctx;
        const time = performance.now();

        // Тёмный градиент фона (фиолетово-синий)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#0a0020');
        bgGrad.addColorStop(0.4, '#1a0a3e');
        bgGrad.addColorStop(0.8, '#0d1b3e');
        bgGrad.addColorStop(1, '#050510');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Туманности
        for (const n of this.nebulas) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = n.color;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Звёзды
        for (const star of this.stars) {
            const brightness = 0.3 + Math.sin(time * 0.001 * star.speed + star.phase) * 0.7;
            ctx.globalAlpha = brightness;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Падающие звёзды
        for (const s of this.fallingStars) {
            const alpha = s.life / s.maxLife;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Силуэт леса (внизу)
        ctx.fillStyle = '#050510';
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        for (const p of this.forestSilhouette) {
            ctx.lineTo(p.x, this.height - p.h);
        }
        ctx.lineTo(this.width, this.height);
        ctx.closePath();
        ctx.fill();

        // Светлячки
        for (const ff of this.menuFireflies) {
            const b = 0.4 + Math.sin(ff.phase) * 0.6;
            ctx.globalAlpha = b * 0.7;
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = b * 0.2;
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, ff.size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }



    // === ГЛАВНОЕ МЕНЮ ===
    renderMainMenu(hasSave, crystalBalance, activeSkin) {
        const ctx = this.ctx;
        const time = performance.now();

        this._drawBackground();

        // Парящие кристаллы вокруг названия
        const titleCenterX = this.width / 2;
        const titleCenterY = 100;
        for (const c of this.floatingCrystals) {
            const cx = titleCenterX + Math.cos(c.angle) * c.radius;
            const cy = titleCenterY + Math.sin(c.angle) * c.radius * 0.4;
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = c.color;
            ctx.shadowColor = c.color;
            ctx.shadowBlur = 6;
            // Маленький ромб
            ctx.beginPath();
            ctx.moveTo(cx, cy - c.size);
            ctx.lineTo(cx + c.size * 0.5, cy);
            ctx.lineTo(cx, cy + c.size * 0.6);
            ctx.lineTo(cx - c.size * 0.5, cy);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Название игры с золотым градиентом и покачиванием
        const titleWobble = Math.sin(this.titlePhase * 2) * 2;
        ctx.save();
        ctx.translate(titleCenterX, 95 + titleWobble);

        // Золотой градиент текста
        const titleGrad = ctx.createLinearGradient(-130, -20, 130, 20);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.3, '#fff8dc');
        titleGrad.addColorStop(0.5, '#ffd700');
        titleGrad.addColorStop(0.7, '#ffb300');
        titleGrad.addColorStop(1, '#ffd700');

        ctx.font = 'bold 30px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Тень текста
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = titleGrad;
        ctx.fillText('Волшебный Лабиринт', 0, 0);

        // Обводка
        ctx.strokeStyle = '#8b5e00';
        ctx.lineWidth = 0.8;
        ctx.strokeText('Волшебный Лабиринт', 0, 0);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Подзаголовок
        ctx.font = '14px Georgia, serif';
        ctx.fillStyle = '#b388ff';
        ctx.fillText('В поисках звёздного кристалла', 0, 30);

        ctx.restore();

        // Баланс кристаллов
        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#64b5f6';
        ctx.textAlign = 'center';
        ctx.fillText(`💎 ${crystalBalance || 0}`, this.width / 2, 145);

        // Лисёнок Фокси (детализированный с текущим скином)
        const foxyX = this.width / 2;
        const foxyY = 260 + Math.sin(this.foxyPhase) * 5 - this.foxyJump;
        this._drawMenuFoxy(foxyX, foxyY, activeSkin, time);

        // Кнопки
        const btnY = 380;
        this._drawFancyButton(this.width / 2, btnY, 180, 52, 'Играть', 'gold', 0);
        
        let nextBtnY = btnY + 70;
        if (hasSave) {
            this._drawFancyButton(this.width / 2, nextBtnY, 180, 48, 'Продолжить', 'purple', 1);
            nextBtnY += 65;
        }
        this._drawFancyButton(this.width / 2, nextBtnY, 180, 48, '⭐ Гардероб', 'blue', 2);

        ctx.textAlign = 'left';

        // Плавный переход
        if (this.transitionAlpha > 0) {
            ctx.globalAlpha = this.transitionAlpha;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.globalAlpha = 1;
        }
    }

    // === ЭКРАН ПАУЗЫ ===
    renderPauseScreen() {
        const ctx = this.ctx;
        const time = performance.now();

        // Затемнение
        ctx.fillStyle = 'rgba(10, 5, 30, 0.75)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Надпись "Пауза" с пульсацией
        const pulse = 1 + Math.sin(time * 0.003) * 0.05;
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2 - 80);
        ctx.scale(pulse, pulse);
        ctx.font = 'bold 42px Georgia, serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#7c4dff';
        ctx.shadowBlur = 15;
        ctx.fillText('Пауза', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Кнопки
        this._drawFancyButton(this.width / 2, this.height / 2, 180, 48, 'Продолжить', 'gold', 0);
        this._drawFancyButton(this.width / 2, this.height / 2 + 65, 180, 48, '⭐ Гардероб', 'blue', 1);
        this._drawFancyButton(this.width / 2, this.height / 2 + 130, 180, 48, 'В меню', 'red', 2);

        ctx.textAlign = 'left';
    }

    // === ЭКРАН ПРОИГРЫША ===
    renderGameOver(score, level, highScore, activeSkin) {
        const ctx = this.ctx;
        const time = performance.now();

        this._drawBackground();

        // Грустный лисёнок
        this._drawSadFoxy(this.width / 2, 200, activeSkin);

        // Текст
        ctx.font = 'bold 28px Georgia, serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.fillText('Ой! Попробуй ещё раз', this.width / 2, 310);
        ctx.shadowBlur = 0;

        // Статистика
        ctx.font = '16px Arial';
        ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_SCORE;
        ctx.fillText(`Очки: ${score}`, this.width / 2, 360);
        ctx.fillStyle = '#b388ff';
        ctx.fillText(`Уровень: ${level}`, this.width / 2, 390);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Рекорд: ${highScore}`, this.width / 2, 420);

        // Кнопка
        this._drawFancyButton(this.width / 2, 490, 180, 52, 'Заново', 'gold', 0);

        ctx.textAlign = 'left';
    }

    // === ЭКРАН ГАРДЕРОБА ===
    renderShop(shop, time) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Богатый фон (звёздное небо с бархатным оттенком)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0020');
        bgGrad.addColorStop(0.3, '#1a0040');
        bgGrad.addColorStop(0.7, '#150030');
        bgGrad.addColorStop(1, '#0a0015');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Звёзды на фоне
        for (let i = 0; i < 30; i++) {
            const sx = (Math.sin(time * 0.0005 + i * 2.1) + 1) * w / 2;
            const sy = (Math.cos(time * 0.0003 + i * 1.7) + 1) * h / 2;
            const b = 0.2 + Math.sin(time * 0.001 + i) * 0.3;
            ctx.globalAlpha = b;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Заголовок
        ctx.font = 'bold 24px Georgia, serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fillText('Волшебный Гардероб', w / 2, 38);
        ctx.shadowBlur = 0;

        // Баланс
        ctx.font = 'bold 15px Arial';
        ctx.fillStyle = '#64b5f6';
        ctx.fillText(`💎 ${shop.getCrystals()}`, w / 2, 65);

        // Кнопка закрытия
        ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
        ctx.beginPath();
        ctx.arc(w - 30, 30, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w - 37, 23);
        ctx.lineTo(w - 23, 37);
        ctx.moveTo(w - 23, 23);
        ctx.lineTo(w - 37, 37);
        ctx.stroke();

        // Сетка скинов
        const gridStartX = 20;
        const gridStartY = 90;
        const cellW = (w - 60) / 2;
        const cellH = 105;
        const gap = 10;

        for (let i = 0; i < SKINS_DATA.length; i++) {
            const skin = SKINS_DATA[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = gridStartX + col * (cellW + gap);
            const cy = gridStartY + row * (cellH + gap) - shop.scrollOffset;

            if (cy + cellH < 75 || cy > h) continue;

            const isOwned = shop.isOwned(i);
            const isActive = shop.activeSkinId === i;
            const canBuy = shop.canBuy(i);

            // Рамка карточки
            ctx.save();
            if (isActive) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 8;
            } else if (isOwned) {
                ctx.strokeStyle = '#64b5f6';
                ctx.lineWidth = 1.5;
            } else if (canBuy) {
                ctx.strokeStyle = '#888888';
                ctx.lineWidth = 1;
            } else {
                ctx.strokeStyle = '#444444';
                ctx.lineWidth = 1;
            }

            // Фон карточки
            ctx.fillStyle = isActive ? 'rgba(255, 215, 0, 0.1)' :
                           isOwned ? 'rgba(100, 181, 246, 0.08)' :
                           'rgba(40, 40, 60, 0.5)';
            this._roundedRect(cx, cy, cellW, cellH, 10);
            ctx.fill();
            this._roundedRect(cx, cy, cellW, cellH, 10);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();

            // Мини лисёнок
            if (isOwned || canBuy) {
                this._drawMiniSkin(cx + 30, cy + cellH / 2, skin);
            } else {
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(cx + 30, cy + cellH / 2, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('?', cx + 30, cy + cellH / 2 + 5);
            }

            // Информация
            ctx.textAlign = 'left';
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = isOwned ? '#ffffff' : (canBuy ? '#ffd700' : '#888');
            ctx.fillText(skin.name, cx + 55, cy + 22);

            ctx.font = '10px Arial';
            if (isActive) {
                ctx.fillStyle = '#4caf50';
                ctx.fillText('✓ Надето', cx + 55, cy + 40);
            } else if (isOwned) {
                ctx.fillStyle = '#64b5f6';
                ctx.fillText('Нажми надеть', cx + 55, cy + 40);
            } else {
                ctx.fillStyle = canBuy ? '#ffd700' : '#ff5252';
                ctx.fillText(`💎 ${skin.price}`, cx + 55, cy + 40);
            }

            ctx.font = '9px Arial';
            ctx.fillStyle = '#999';
            const desc = skin.description.substring(0, 30);
            ctx.fillText(desc, cx + 55, cy + 58);

            // Звёзды тира
            for (let s = 0; s < skin.tier; s++) {
                ctx.fillStyle = isOwned ? '#ffd700' : '#444';
                ctx.font = '9px Arial';
                ctx.fillText('★', cx + 55 + s * 10, cy + cellH - 10);
            }
        }

        // Подсказка
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('Собирай кристаллы в лабиринтах!', w / 2, h - 12);
        ctx.textAlign = 'left';
    }



    // === КРАСИВЫЕ КНОПКИ ===
    _drawFancyButton(x, y, w, h, text, style, id) {
        const ctx = this.ctx;
        const pressed = (this.buttonPressedId === id);
        const scale = pressed ? 0.93 : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Градиент кнопки
        let grad;
        const r = 22;
        switch (style) {
            case 'gold':
                grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
                grad.addColorStop(0, '#ffd700');
                grad.addColorStop(0.5, '#ffab00');
                grad.addColorStop(1, '#ff8f00');
                break;
            case 'purple':
                grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
                grad.addColorStop(0, '#9c27b0');
                grad.addColorStop(0.5, '#7b1fa2');
                grad.addColorStop(1, '#6a1b9a');
                break;
            case 'blue':
                grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
                grad.addColorStop(0, '#42a5f5');
                grad.addColorStop(0.5, '#1e88e5');
                grad.addColorStop(1, '#1565c0');
                break;
            case 'red':
                grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
                grad.addColorStop(0, '#ef5350');
                grad.addColorStop(0.5, '#e53935');
                grad.addColorStop(1, '#c62828');
                break;
            default:
                grad = '#888888';
        }

        // Тень кнопки
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = pressed ? 4 : 10;
        ctx.shadowOffsetY = pressed ? 2 : 5;

        // Скруглённый прямоугольник
        ctx.beginPath();
        ctx.moveTo(-w/2 + r, -h/2);
        ctx.lineTo(w/2 - r, -h/2);
        ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
        ctx.lineTo(w/2, h/2 - r);
        ctx.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
        ctx.lineTo(-w/2 + r, h/2);
        ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
        ctx.lineTo(-w/2, -h/2 + r);
        ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
        ctx.closePath();

        ctx.fillStyle = grad;
        ctx.fill();

        // Блик сверху
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -h/2 + h * 0.2, w * 0.35, h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Текст
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText(text, 0, 1);
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';

        ctx.restore();
    }

    // === ЛИСЁНОК В МЕНЮ (ДЕТАЛИЗИРОВАННЫЙ) ===
    _drawMenuFoxy(x, y, activeSkin, time) {
        const ctx = this.ctx;
        const size = 28;
        const skin = activeSkin;

        const bodyColor = skin ? skin.bodyColor : GAME_CONSTANTS.COLORS.FOXY_BODY;
        const bellyColor = skin ? skin.bellyColor : GAME_CONSTANTS.COLORS.FOXY_BELLY;
        const tailColor = skin ? skin.tailColor : GAME_CONSTANTS.COLORS.FOXY_TAIL;
        const earsColor = skin ? skin.earsColor : GAME_CONSTANTS.COLORS.FOXY_EARS;

        // Свечение скина
        if (skin && skin.glowIntensity > 5) {
            ctx.shadowColor = skin.glowColor;
            ctx.shadowBlur = skin.glowIntensity * 0.6;
        }

        // Хвост (покачивание)
        const tailWag = Math.sin(time * 0.004) * 0.3;
        ctx.save();
        ctx.translate(x - size * 0.7, y + size * 0.3);
        ctx.rotate(tailWag);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-size * 0.4, -size * 0.5, -size * 0.9, -size * 0.3, -size * 0.8, size * 0.1);
        ctx.bezierCurveTo(-size * 0.7, size * 0.3, -size * 0.3, size * 0.2, 0, 0);
        ctx.fillStyle = tailColor;
        ctx.fill();
        ctx.restore();

        // Тело
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();

        // Животик
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.3, size * 0.55, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = bellyColor;
        ctx.fill();

        // Ушки
        ctx.fillStyle = earsColor;
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, y - size * 0.8);
        ctx.lineTo(x - size * 0.25, y - size * 1.5);
        ctx.lineTo(x, y - size * 0.8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.8);
        ctx.lineTo(x + size * 0.25, y - size * 1.5);
        ctx.lineTo(x + size * 0.5, y - size * 0.8);
        ctx.fill();
        // Розовая внутренность
        ctx.fillStyle = '#ffb3c1';
        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, y - size * 0.85);
        ctx.lineTo(x - size * 0.25, y - size * 1.3);
        ctx.lineTo(x - size * 0.1, y - size * 0.85);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + size * 0.1, y - size * 0.85);
        ctx.lineTo(x + size * 0.25, y - size * 1.3);
        ctx.lineTo(x + size * 0.4, y - size * 0.85);
        ctx.fill();

        // Глаза (большие, живые)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - size * 0.22, y - size * 0.2, size * 0.18, 0, Math.PI * 2);
        ctx.arc(x + size * 0.22, y - size * 0.2, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x - size * 0.22, y - size * 0.18, size * 0.12, 0, Math.PI * 2);
        ctx.arc(x + size * 0.22, y - size * 0.18, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - size * 0.18, y - size * 0.22, size * 0.05, 0, Math.PI * 2);
        ctx.arc(x + size * 0.26, y - size * 0.22, size * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Нос
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x, y + size * 0.05, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Улыбка
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y + size * 0.15, size * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();

        // Машущая лапка
        const waveAngle = Math.sin(this.foxyWave) * 0.5;
        ctx.save();
        ctx.translate(x + size * 0.8, y);
        ctx.rotate(waveAngle - 0.6);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.4, size * 0.18, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        // Пальчики
        ctx.fillStyle = bellyColor;
        ctx.beginPath();
        ctx.arc(-size * 0.05, -size * 0.7, size * 0.05, 0, Math.PI * 2);
        ctx.arc(size * 0.05, -size * 0.72, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.shadowBlur = 0;
    }

    // === ГРУСТНЫЙ ЛИСЁНОК ===
    _drawSadFoxy(x, y, activeSkin) {
        const ctx = this.ctx;
        const size = 25;
        const bodyColor = activeSkin ? activeSkin.bodyColor : GAME_CONSTANTS.COLORS.FOXY_BODY;
        const bellyColor = activeSkin ? activeSkin.bellyColor : GAME_CONSTANTS.COLORS.FOXY_BELLY;

        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.3, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = bellyColor;
        ctx.fill();

        // Грустные глаза
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x - size * 0.25, y - size * 0.1, size * 0.12, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y - size * 0.1, size * 0.12, 0, Math.PI);
        ctx.stroke();
        // Грустный рот
        ctx.beginPath();
        ctx.arc(x, y + size * 0.4, size * 0.15, Math.PI, 0);
        ctx.stroke();
        // Слёзка
        ctx.fillStyle = '#87ceeb';
        ctx.beginPath();
        ctx.ellipse(x - size * 0.3, y + size * 0.05, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // === МИНИ-СКИН В ГАРДЕРОБЕ ===
    _drawMiniSkin(x, y, skin) {
        const ctx = this.ctx;
        const size = 14;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.bodyColor;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.3, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.bellyColor;
        ctx.fill();
        // Ушки
        ctx.fillStyle = skin.earsColor;
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, y - size * 0.7);
        ctx.lineTo(x - size * 0.2, y - size * 1.3);
        ctx.lineTo(x + size * 0.1, y - size * 0.7);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - size * 0.1, y - size * 0.7);
        ctx.lineTo(x + size * 0.2, y - size * 1.3);
        ctx.lineTo(x + size * 0.5, y - size * 0.7);
        ctx.fill();
        // Глаза
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y - size * 0.15, 2, 0, Math.PI * 2);
        ctx.arc(x + size * 0.2, y - size * 0.15, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // === ВСПОМОГАТЕЛЬНОЕ ===
    _roundedRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // === ОПРЕДЕЛЕНИЕ НАЖАТИЯ НА КНОПКУ ===
    getButtonAt(x, y, state, hasSave) {
        const btnW = 180, btnH = 52;
        const isInBtn = (bx, by, bw, bh) => {
            return x >= bx - bw/2 && x <= bx + bw/2 && y >= by - bh/2 && y <= by + bh/2;
        };

        if (state === 'menu') {
            if (isInBtn(this.width / 2, 380, btnW, btnH)) return 'play';
            let nextY = 450;
            if (hasSave) {
                if (isInBtn(this.width / 2, nextY, btnW, 48)) return 'continue';
                nextY += 65;
            }
            if (isInBtn(this.width / 2, nextY, btnW, 48)) return 'shop';
        } else if (state === 'pause') {
            if (isInBtn(this.width / 2, this.height / 2, btnW, 48)) return 'resume';
            if (isInBtn(this.width / 2, this.height / 2 + 65, btnW, 48)) return 'shop';
            if (isInBtn(this.width / 2, this.height / 2 + 130, btnW, 48)) return 'menu';
        } else if (state === 'gameover') {
            if (isInBtn(this.width / 2, 490, btnW, btnH)) return 'restart';
        } else if (state === 'shop') {
            // Кнопка закрытия
            const dx = x - (this.width - 30);
            const dy = y - 30;
            if (dx * dx + dy * dy < 16 * 16) return 'close';
        }
        return null;
    }

    // Запуск перехода
    startTransition(direction) {
        this.transitionDirection = direction;
        if (direction > 0) this.transitionAlpha = 0;
    }
}
