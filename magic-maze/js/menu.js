// Файл: magic-maze/js/menu.js
// Полностью переработанная система меню в минималистичном детском стиле.
// Вдохновение: Toca Boca, Sago Mini — мягкие пастельные тона, чистые формы,
// отсутствие тяжёлых космических фонов и крикливой графики.
//
// Палитра:
//   фон:        #FFF8F0 (нежно-кремовый) с тонким верхним хайлайтом
//   персиковый: #FFD4B8 / #FFB89A (градиент основной кнопки)
//   мятный:     #B5E8D5 / #8DD3B6
//   голубой:    #C8E2F2 / #A8CFE8
//   текст:      #5C4438 (тёплый коричневый, не чёрный)
//   акцент:     #E8A87C (приглушённый золотисто-оранжевый для названия)
//   тень:       rgba(92, 68, 56, 0.12)
//
// Принципы:
//   - Никаких shadowBlur > 4 на кнопках (мягкая тень, без неона).
//   - Минимум одновременных движений: 2 облачка + 2 звёздочки.
//   - Кнопки реагируют на нажатие мгновенно (onPress() сразу меняет масштаб).
//   - Все экраны (main, pause, gameover, levelComplete, shop, levelIntro)
//     используют общую функцию рисования карточки.

class MenuSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;

        // === Фоновые элементы (минимум) ===
        // 2 облачка плывут слева направо, 2 звёздочки мерцают.
        this.clouds = [
            { x: 100, y: 90,  w: 70, opacity: 0.6, speed: 0.012 },
            { x: 320, y: 150, w: 55, opacity: 0.45, speed: 0.008 }
        ];
        this.stars = [
            { x: 60,  y: 200, size: 3, phase: 0,        speed: 0.0015 },
            { x: 440, y: 240, size: 2.5, phase: Math.PI, speed: 0.0018 }
        ];

        // === Анимация лисёнка на стартовом экране ===
        this.foxyBobPhase = 0;     // лёгкое покачивание
        this.foxyWavePhase = 0;    // взмах лапкой
        this.foxyWaveCooldown = 5000; // машет каждые 5с
        this._waveTimer = 0;

        // === Состояние нажатия кнопки ===
        // Когда пользователь касается кнопки, мы СРАЗУ ставим pressedId,
        // чтобы визуально кнопка дёрнулась в тот же кадр (мгновенный отклик).
        this.pressedButtonId = null;
        this.pressAnimTimer = 0;

        // === Переход между экранами (fade) ===
        this.transitionAlpha = 0;
        this.transitionDirection = 0;

        // Кеш позиций кнопок: заполняется в каждом render*
        // и используется в getButtonAt() для попадания.
        this._buttonHitboxes = {};
    }

    // ======================================================================
    // ОБНОВЛЕНИЕ ФОНА (вызывается из game loop)
    // ======================================================================
    updateBackground(deltaTime) {
        // Облачка плывут вправо, при выходе за край возвращаются слева
        for (const c of this.clouds) {
            c.x += c.speed * deltaTime;
            if (c.x > this.width + c.w) c.x = -c.w;
        }
        // Звёздочки мерцают
        for (const s of this.stars) {
            s.phase += deltaTime * s.speed;
        }
        // Анимация лисёнка
        this.foxyBobPhase += deltaTime * 0.002;
        this._waveTimer += deltaTime;
        if (this._waveTimer > this.foxyWaveCooldown) {
            this.foxyWavePhase += deltaTime * 0.008;
            if (this.foxyWavePhase > Math.PI * 2) {
                this.foxyWavePhase = 0;
                this._waveTimer = 0;
            }
        }
        // Анимация нажатия кнопки (короткая, ~120 мс — обратная связь)
        if (this.pressedButtonId !== null) {
            this.pressAnimTimer -= deltaTime;
            if (this.pressAnimTimer <= 0) {
                this.pressedButtonId = null;
            }
        }
        // Переход
        if (this.transitionDirection !== 0) {
            this.transitionAlpha += this.transitionDirection * deltaTime * 0.003;
            if (this.transitionAlpha >= 1) { this.transitionAlpha = 1; this.transitionDirection = 0; }
            if (this.transitionAlpha <= 0) { this.transitionAlpha = 0; this.transitionDirection = 0; }
        }
    }

    // Помечаем, что кнопка нажата (вызывается из Game перед действием —
    // ИЛИ мы рисуем уменьшенную версию в следующий кадр).
    pressButton(id) {
        this.pressedButtonId = id;
        this.pressAnimTimer = 120;
    }

    // ======================================================================
    // ФОНОВАЯ ЗАЛИВКА (мягкий вертикальный градиент)
    // ======================================================================
    _drawSoftBackground(palette = MenuSystem.PALETTE.bg, palTop = MenuSystem.PALETTE.bgTop) {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, palTop);
        grad.addColorStop(1, palette);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    // Маленькие плывущие облачка (в две округлые формы)
    _drawClouds() {
        const ctx = this.ctx;
        ctx.save();
        for (const c of this.clouds) {
            ctx.globalAlpha = c.opacity;
            ctx.fillStyle = '#FFFFFF';
            // Облачко из трёх кругов — простая мягкая форма
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.w * 0.35, 0, Math.PI * 2);
            ctx.arc(c.x + c.w * 0.35, c.y - c.w * 0.05, c.w * 0.4, 0, Math.PI * 2);
            ctx.arc(c.x + c.w * 0.7, c.y, c.w * 0.32, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Мерцающие звёздочки (просто 4-лучевые)
    _drawStars() {
        const ctx = this.ctx;
        ctx.save();
        for (const s of this.stars) {
            const brightness = 0.4 + (Math.sin(s.phase) * 0.5 + 0.5) * 0.6;
            ctx.globalAlpha = brightness;
            ctx.fillStyle = MenuSystem.PALETTE.accent;
            // Простая 4-лучевая звезда из двух пересекающихся ромбов
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - s.size);
            ctx.lineTo(s.x + s.size * 0.4, s.y);
            ctx.lineTo(s.x, s.y + s.size);
            ctx.lineTo(s.x - s.size * 0.4, s.y);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(s.x - s.size, s.y);
            ctx.lineTo(s.x, s.y - s.size * 0.4);
            ctx.lineTo(s.x + s.size, s.y);
            ctx.lineTo(s.x, s.y + s.size * 0.4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // ======================================================================
    // СКРУГЛЁННЫЙ ПРЯМОУГОЛЬНИК (используется везде)
    // ======================================================================
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

    // ======================================================================
    // КНОПКА: МЯГКИЙ ГРАДИЕНТ + СКРУГЛЕНИЕ + ЛЁГКАЯ ТЕНЬ + ВСПЫШКА
    // style: 'primary' (персик), 'secondary' (мятный), 'soft' (бежевый), 'small' (маленькая)
    // ======================================================================
    _drawSoftButton(x, y, w, h, text, style, id, options = {}) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const pressed = (this.pressedButtonId === id);
        // При нажатии — лёгкое уменьшение (по ТЗ — 105% при отжатии,
        // здесь делаем обратное: уменьшаем при нажатии для тактильной обратной связи)
        const scale = pressed ? 0.96 : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Тень (мягкая, не неоновая)
        ctx.shadowColor = P.cardShadow;
        ctx.shadowBlur = pressed ? 4 : 8;
        ctx.shadowOffsetY = pressed ? 1 : 3;

        // Градиент по стилю
        let c1, c2, textColor;
        switch (style) {
            case 'primary':   c1 = P.peach1; c2 = P.peach2; textColor = '#FFFFFF'; break;
            case 'secondary': c1 = P.mint1;  c2 = P.mint2;  textColor = '#FFFFFF'; break;
            case 'soft':      c1 = '#FFFFFF'; c2 = '#FBF3EA'; textColor = P.text; break;
            case 'sky':       c1 = P.sky1;   c2 = P.sky2;   textColor = '#FFFFFF'; break;
            default:          c1 = P.peach1; c2 = P.peach2; textColor = '#FFFFFF';
        }
        const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);

        // Скругление 30px на больших кнопках (по ТЗ)
        const r = options.radius != null ? options.radius : Math.min(30, h / 2);
        this._roundedRect(-w / 2, -h / 2, w, h, r);
        ctx.fillStyle = grad;
        ctx.fill();

        // Тонкий блик сверху (не агрессивный)
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#FFFFFF';
        this._roundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.35, r * 0.7);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Если кнопка только что нажата — вспышка (чуть светлее)
        if (pressed) {
            ctx.globalAlpha = 0.25 * (this.pressAnimTimer / 120);
            ctx.fillStyle = '#FFFFFF';
            this._roundedRect(-w / 2, -h / 2, w, h, r);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Текст
        ctx.font = options.font || 'bold 22px "Comic Sans MS", "Marker Felt", system-ui, sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 1);
        ctx.textBaseline = 'alphabetic';

        ctx.restore();

        // Сохраняем хитбокс (использует getButtonAt)
        this._buttonHitboxes[id] = { x, y, w, h };
    }

    // Маленькая круглая кнопка (для гардероба, закрытия, продолжить)
    _drawCircleButton(x, y, r, icon, id, color = MenuSystem.PALETTE.sky1) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const pressed = (this.pressedButtonId === id);
        const scale = pressed ? 0.9 : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.shadowColor = P.cardShadow;
        ctx.shadowBlur = pressed ? 3 : 6;
        ctx.shadowOffsetY = pressed ? 1 : 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Иконка
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${r * 1.1}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 1);
        ctx.textBaseline = 'alphabetic';

        ctx.restore();
        this._buttonHitboxes[id] = { x, y, w: r * 2, h: r * 2, circular: true, r };
    }

    // ======================================================================
    // ЛИСЁНОК ДЛЯ МЕНЮ (мягкий, скруглённый, без острых деталей)
    // ======================================================================
    _drawCuteFoxy(x, y, scale, activeSkin, options = {}) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const size = 28 * scale;

        // Цвета: либо со скина, либо нежный персик
        const bodyColor  = activeSkin ? activeSkin.bodyColor  : '#F5A878';
        const bellyColor = activeSkin ? activeSkin.bellyColor : '#FFEDD5';
        const tailColor  = activeSkin ? activeSkin.tailColor  : '#E89060';
        const earsColor  = activeSkin ? activeSkin.earsColor  : '#D87850';

        // Лёгкое покачивание
        const bob = options.bob != null ? options.bob : Math.sin(this.foxyBobPhase) * 3;
        const drawY = y + bob;

        ctx.save();

        // Тень под лисёнком (мягкая, эллипс)
        ctx.fillStyle = P.cardShadow;
        ctx.beginPath();
        ctx.ellipse(x, drawY + size * 1.3, size * 0.7, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Хвост (просто пушистый овал слева)
        ctx.save();
        ctx.translate(x - size * 0.6, drawY + size * 0.4);
        ctx.rotate(Math.sin(this.foxyBobPhase * 1.5) * 0.15);
        ctx.fillStyle = tailColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.3, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyColor;
        ctx.beginPath();
        ctx.ellipse(-size * 0.25, size * 0.05, size * 0.18, size * 0.12, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Тело
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(x, drawY + size * 0.2, size * 0.7, size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        // Животик
        ctx.fillStyle = bellyColor;
        ctx.beginPath();
        ctx.ellipse(x, drawY + size * 0.45, size * 0.4, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Голова
        const headY = drawY - size * 0.5;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(x, headY, size * 0.55, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ушки (округлённые, не острые — детский стиль)
        ctx.fillStyle = earsColor;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.32, headY - size * 0.32, size * 0.15, size * 0.22, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + size * 0.32, headY - size * 0.32, size * 0.15, size * 0.22, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Розовая внутренность
        ctx.fillStyle = P.pink;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.32, headY - size * 0.30, size * 0.07, size * 0.12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + size * 0.32, headY - size * 0.30, size * 0.07, size * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Щёчки (нежно-розовые круги)
        ctx.fillStyle = 'rgba(248, 200, 208, 0.7)';
        ctx.beginPath();
        ctx.arc(x - size * 0.25, headY + size * 0.18, size * 0.13, 0, Math.PI * 2);
        ctx.arc(x + size * 0.25, headY + size * 0.18, size * 0.13, 0, Math.PI * 2);
        ctx.fill();

        // Глазки
        const emotion = options.emotion || 'normal';
        ctx.fillStyle = '#3D2B1F';
        if (emotion === 'sad') {
            // Перевёрнутые дуги — грустные глаза
            ctx.lineWidth = size * 0.06;
            ctx.strokeStyle = '#3D2B1F';
            ctx.beginPath();
            ctx.arc(x - size * 0.20, headY + size * 0.02, size * 0.10, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + size * 0.20, headY + size * 0.02, size * 0.10, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
        } else {
            // Точки-глазки (большие, добрые)
            ctx.beginPath();
            ctx.arc(x - size * 0.20, headY, size * 0.09, 0, Math.PI * 2);
            ctx.arc(x + size * 0.20, headY, size * 0.09, 0, Math.PI * 2);
            ctx.fill();
            // Блики
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x - size * 0.18, headY - size * 0.025, size * 0.03, 0, Math.PI * 2);
            ctx.arc(x + size * 0.22, headY - size * 0.025, size * 0.03, 0, Math.PI * 2);
            ctx.fill();
        }

        // Носик
        ctx.fillStyle = '#3D2B1F';
        ctx.beginPath();
        ctx.arc(x, headY + size * 0.18, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Ротик
        ctx.strokeStyle = '#3D2B1F';
        ctx.lineWidth = size * 0.04;
        ctx.lineCap = 'round';
        if (emotion === 'sad') {
            ctx.beginPath();
            ctx.arc(x, headY + size * 0.36, size * 0.08, Math.PI, 0);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x, headY + size * 0.28, size * 0.08, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        }

        // Машущая лапка (только на стартовом экране)
        if (options.waving && this.foxyWavePhase > 0) {
            const waveAngle = Math.sin(this.foxyWavePhase) * 0.6 - 0.3;
            ctx.save();
            ctx.translate(x + size * 0.55, drawY - size * 0.05);
            ctx.rotate(waveAngle);
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.35, size * 0.13, size * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = bellyColor;
            ctx.beginPath();
            ctx.arc(-size * 0.04, -size * 0.55, size * 0.05, 0, Math.PI * 2);
            ctx.arc(size * 0.04, -size * 0.55, size * 0.04, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    // ======================================================================
    // КАРТОЧКА (для центральных диалогов: пауза, проигрыш, завершение уровня)
    // ======================================================================
    _drawCard(x, y, w, h) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        ctx.save();
        ctx.shadowColor = P.cardShadow;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = P.cardBg;
        this._roundedRect(x, y, w, h, 22);
        ctx.fill();
        ctx.restore();
        // Тонкий ободок
        ctx.strokeStyle = P.cardBorder;
        ctx.lineWidth = 1;
        this._roundedRect(x, y, w, h, 22);
        ctx.stroke();
    }

    // ======================================================================
    // ГЛАВНОЕ МЕНЮ (стартовый экран)
    // ======================================================================
    renderMainMenu(hasSave, crystalBalance, activeSkin) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        this._buttonHitboxes = {}; // сброс перед перерисовкой

        // 1. Мягкий кремовый фон
        this._drawSoftBackground();

        // 2. Облачка и звёздочки (легкая фоновая жизнь)
        this._drawClouds();
        this._drawStars();

        // 3. Название игры — крупный округлый шрифт, тёплый оранжевый
        ctx.save();
        ctx.font = 'bold 32px "Comic Sans MS", "Marker Felt", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Лёгкая тень — без обводки
        ctx.shadowColor = 'rgba(232, 168, 124, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = P.accent;
        ctx.fillText('Сказочный Лабиринт', this.width / 2, 90);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        // Подзаголовок — тонкий, мягкий
        ctx.font = '14px "Comic Sans MS", system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.fillText('Магия процедурных миров', this.width / 2, 118);
        ctx.restore();

        // 4. Лисёнок по центру, чуть выше кнопок
        const foxyY = 250;
        this._drawCuteFoxy(this.width / 2, foxyY, 1.4, activeSkin, { waving: true });

        // 5. Баланс кристаллов — маленький pill вверху
        if (crystalBalance > 0) {
            ctx.save();
            const pillW = 80, pillH = 26;
            const pillX = this.width / 2 - pillW / 2;
            const pillY = 145;
            ctx.fillStyle = '#FFFFFFCC';
            this._roundedRect(pillX, pillY, pillW, pillH, 13);
            ctx.fill();
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.fillStyle = P.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`💎 ${crystalBalance}`, this.width / 2, pillY + pillH / 2 + 1);
            ctx.textBaseline = 'alphabetic';
            ctx.restore();
        }

        // 6. Кнопки
        // Главная кнопка «Играть» (или «Заново», если есть сохранение)
        const btnY = 430;
        const mainW = 200, mainH = 60;
        this._drawSoftButton(this.width / 2, btnY, mainW, mainH, 'Играть', 'primary', 'play');

        // Кнопка «Продолжить» — если есть сохранение, под главной, светлее
        let nextY = btnY + 75;
        if (hasSave) {
            this._drawSoftButton(this.width / 2, nextY, 170, 48, 'Продолжить', 'soft', 'continue');
            nextY += 60;
        }

        // Кнопка «Гардероб» — маленькая круглая со звёздочкой справа от главной
        this._drawCircleButton(
            this.width / 2 + mainW / 2 + 30, btnY,
            22, '⭐', 'shop', P.mint1
        );
        // Подпись «Гардероб»
        ctx.save();
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.textAlign = 'center';
        ctx.fillText('Гардероб', this.width / 2 + mainW / 2 + 30, btnY + 38);
        ctx.restore();

        // 7. Подвал — версия / автор (опционально, мягко)
        ctx.save();
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.globalAlpha = 0.6;
        ctx.textAlign = 'center';
        ctx.fillText('💗 для маленьких искателей приключений', this.width / 2, this.height - 18);
        ctx.restore();

        this._renderTransitionFade();
    }

    // ======================================================================
    // ЭКРАН ПАУЗЫ — компактная карточка по центру, размытый фон под игрой
    // ======================================================================
    renderPauseScreen() {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        this._buttonHitboxes = {};

        // Полупрозрачный светлый overlay (по ТЗ — светло-серый с альфой 0.3)
        ctx.fillStyle = 'rgba(255, 248, 240, 0.55)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Карточка
        const cardW = 240, cardH = 280;
        const cardX = (this.width - cardW) / 2;
        const cardY = (this.height - cardH) / 2;
        this._drawCard(cardX, cardY, cardW, cardH);

        // Заголовок «Пауза»
        ctx.save();
        ctx.font = 'bold 26px "Comic Sans MS", system-ui, sans-serif';
        ctx.fillStyle = P.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Пауза', this.width / 2, cardY + 38);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // Маленький лисёнок над кнопками
        this._drawCuteFoxy(this.width / 2, cardY + 80, 0.7, null);

        // Кнопки (компактные, в столбик)
        const btnW = 180, btnH = 44;
        const btnX = this.width / 2;
        let btnY = cardY + 145;
        this._drawSoftButton(btnX, btnY, btnW, btnH, 'Продолжить', 'primary', 'resume');
        btnY += 56;
        this._drawSoftButton(btnX, btnY, btnW, btnH, 'Гардероб', 'soft', 'shop');
        btnY += 56;
        this._drawSoftButton(btnX, btnY, btnW, btnH, 'Выйти', 'soft', 'menu');
    }

    // ======================================================================
    // ЭКРАН ПРОИГРЫША — светлый, ободряющий
    // ======================================================================
    renderGameOver(score, level, highScore, activeSkin) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        this._buttonHitboxes = {};

        this._drawSoftBackground();
        this._drawClouds();

        // Карточка
        const cardW = 300, cardH = 360;
        const cardX = (this.width - cardW) / 2;
        const cardY = (this.height - cardH) / 2 - 10;
        this._drawCard(cardX, cardY, cardW, cardH);

        // Грустный лисёнок (но не слишком печальный)
        this._drawCuteFoxy(this.width / 2, cardY + 70, 1.0, activeSkin, { emotion: 'sad' });

        // Подбадривающее сообщение
        ctx.save();
        ctx.font = 'bold 22px "Comic Sans MS", system-ui, sans-serif';
        ctx.fillStyle = P.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Не расстраивайся!', this.width / 2, cardY + 175);
        ctx.font = '15px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.fillText('У тебя обязательно получится', this.width / 2, cardY + 200);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // Статистика (мини-таблица)
        ctx.save();
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.textAlign = 'center';
        const statsY = cardY + 230;
        ctx.fillText(`Уровень: ${level}    ✨ ${score}    🏆 ${highScore}`, this.width / 2, statsY);
        ctx.restore();

        // Кнопки
        this._drawSoftButton(this.width / 2, cardY + 280, 180, 50, 'Заново', 'primary', 'restart');
        this._drawSoftButton(this.width / 2, cardY + 335, 140, 38, 'В меню', 'soft', 'menu');
    }

    // ======================================================================
    // ЭКРАН ЗАВЕРШЕНИЯ УРОВНЯ (используется при level_complete, если игрок не в анимации)
    // Сейчас в game loop этот экран автоматически переходит на следующий уровень,
    // но метод оставлен на будущее.
    // ======================================================================
    renderLevelComplete(score, level, activeSkin) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        this._buttonHitboxes = {};

        this._drawSoftBackground();
        this._drawClouds();

        const cardW = 280, cardH = 320;
        const cardX = (this.width - cardW) / 2;
        const cardY = (this.height - cardH) / 2;
        this._drawCard(cardX, cardY, cardW, cardH);

        this._drawCuteFoxy(this.width / 2, cardY + 70, 1.0, activeSkin);

        ctx.save();
        ctx.font = 'bold 24px "Comic Sans MS", system-ui, sans-serif';
        ctx.fillStyle = P.accent;
        ctx.textAlign = 'center';
        ctx.fillText('Молодец!', this.width / 2, cardY + 175);
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.fillText(`Уровень ${level} пройден • ✨ ${score}`, this.width / 2, cardY + 200);
        ctx.restore();

        this._drawSoftButton(this.width / 2, cardY + 260, 180, 50, 'Дальше', 'primary', 'next');
    }

    // ======================================================================
    // ЭКРАН-ИНТРО ПЕРЕД УРОВНЕМ (мягкий fade с числом уровня)
    // ======================================================================
    renderLevelIntro(level, progress) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;

        // Светлый фон
        this._drawSoftBackground();

        // Текст «Уровень N» — увеличивается и затухает к концу
        const scale = 0.7 + progress * 0.4;
        const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(scale, scale);
        ctx.font = 'bold 48px "Comic Sans MS", system-ui, sans-serif';
        ctx.fillStyle = P.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(232, 168, 124, 0.3)';
        ctx.shadowBlur = 8;
        ctx.fillText(`Уровень ${level}`, 0, 0);
        ctx.shadowBlur = 0;
        if (level % 10 === 0) {
            ctx.font = '18px system-ui, sans-serif';
            ctx.fillStyle = P.textSoft;
            ctx.fillText('Хранитель ждёт!', 0, 50);
        }
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    // ======================================================================
    // ГАРДЕРОБ — светлый фон, сетка карточек скинов
    // ======================================================================
    renderShop(shop, time) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;
        this._buttonHitboxes = {};

        // Лавандовый фон (отличает от главного меню)
        this._drawSoftBackground(P.bgShop, '#FAF8FF');

        // Едва заметные силуэты — два круга-«куста»
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = P.text;
        ctx.beginPath();
        ctx.arc(40, h - 60, 60, 0, Math.PI * 2);
        ctx.arc(w - 50, h - 80, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Заголовок
        ctx.save();
        ctx.font = 'bold 24px "Comic Sans MS", system-ui, sans-serif';
        ctx.fillStyle = P.accent;
        ctx.textAlign = 'center';
        ctx.fillText('Гардероб', w / 2, 42);
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.fillText(`💎 ${shop.getCrystals()}`, w / 2, 65);
        ctx.restore();

        // Кнопка закрытия (мягкая стрелка-назад)
        this._drawCircleButton(28, 32, 18, '←', 'close', '#FFFFFF');

        // Сетка скинов — 2 колонки
        const gridStartX = 18;
        const gridStartY = 90;
        const cellW = (w - 54) / 2;
        const cellH = 110;
        const gap = 12;

        for (let i = 0; i < SKINS_DATA.length; i++) {
            const skin = SKINS_DATA[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = gridStartX + col * (cellW + gap);
            const cy = gridStartY + row * (cellH + gap) - shop.scrollOffset;

            // Skip если за пределами видимости
            if (cy + cellH < 80 || cy > h) continue;

            const isOwned = shop.isOwned(i);
            const isActive = shop.activeSkinId === i;
            const canBuy = shop.canBuy(i);

            // Карточка скина — белый прямоугольник с мягкой тенью
            ctx.save();
            ctx.shadowColor = P.cardShadow;
            ctx.shadowBlur = isActive ? 12 : 6;
            ctx.shadowOffsetY = 3;
            ctx.fillStyle = '#FFFFFF';
            this._roundedRect(cx, cy, cellW, cellH, 14);
            ctx.fill();
            ctx.restore();

            // Рамка: золотая если активен, цветная если куплен
            if (isActive) {
                ctx.strokeStyle = P.gold;
                ctx.lineWidth = 2;
            } else if (isOwned) {
                ctx.strokeStyle = P.mint2;
                ctx.lineWidth = 1.5;
            } else {
                ctx.strokeStyle = P.cardBorder;
                ctx.lineWidth = 1;
            }
            this._roundedRect(cx, cy, cellW, cellH, 14);
            ctx.stroke();

            // Превью скина (мини-лисёнок) или знак вопроса
            if (isOwned || canBuy) {
                this._drawMiniSkin(cx + 38, cy + cellH / 2, skin);
            } else {
                ctx.save();
                ctx.fillStyle = '#F0EBE5';
                ctx.beginPath();
                ctx.arc(cx + 38, cy + cellH / 2, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = 'bold 22px system-ui, sans-serif';
                ctx.fillStyle = '#B8A89C';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', cx + 38, cy + cellH / 2 + 1);
                ctx.textBaseline = 'alphabetic';
                ctx.restore();
            }

            // Текст скина
            ctx.textAlign = 'left';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillStyle = P.text;
            ctx.fillText(skin.name, cx + 70, cy + 26);

            // Статус
            ctx.font = '10px system-ui, sans-serif';
            if (isActive) {
                ctx.fillStyle = P.accent;
                ctx.fillText('✓ Надето', cx + 70, cy + 46);
            } else if (isOwned) {
                ctx.fillStyle = P.mint2;
                ctx.fillText('Нажми, чтобы надеть', cx + 70, cy + 46);
            } else {
                ctx.fillStyle = canBuy ? P.accent : '#C8B5A8';
                ctx.fillText(`💎 ${skin.price}`, cx + 70, cy + 46);
            }

            // Описание (короткое)
            ctx.font = '9px system-ui, sans-serif';
            ctx.fillStyle = P.textSoft;
            const desc = skin.description.length > 30
                ? skin.description.substring(0, 28) + '…'
                : skin.description;
            ctx.fillText(desc, cx + 70, cy + 64);

            // Звёзды тира (мягкие, золотистые)
            ctx.font = '10px system-ui, sans-serif';
            for (let s = 0; s < skin.tier; s++) {
                ctx.fillStyle = isOwned ? P.gold : '#E0D5CB';
                ctx.fillText('★', cx + 70 + s * 11, cy + cellH - 10);
            }
        }

        // Подсказка в подвале
        ctx.save();
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = P.textSoft;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.7;
        ctx.fillText('Собирай кристаллы в лабиринтах!', w / 2, h - 12);
        ctx.restore();

        ctx.textAlign = 'left';
    }

    // Маленький лисёнок-превью для карточки гардероба
    _drawMiniSkin(x, y, skin) {
        const ctx = this.ctx;
        const size = 18;
        // Тело
        ctx.fillStyle = skin.bodyColor;
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.75, size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        // Животик
        ctx.fillStyle = skin.bellyColor;
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.25, size * 0.4, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Голова
        ctx.fillStyle = skin.bodyColor;
        ctx.beginPath();
        ctx.arc(x, y - size * 0.45, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Ушки округлые
        ctx.fillStyle = skin.earsColor;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.3, y - size * 0.75, size * 0.13, size * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + size * 0.3, y - size * 0.75, size * 0.13, size * 0.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Глазки
        ctx.fillStyle = '#3D2B1F';
        ctx.beginPath();
        ctx.arc(x - size * 0.18, y - size * 0.45, size * 0.07, 0, Math.PI * 2);
        ctx.arc(x + size * 0.18, y - size * 0.45, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
    }

    // ======================================================================
    // ОПРЕДЕЛЕНИЕ КНОПКИ ПО КООРДИНАТАМ
    // Использует кеш _buttonHitboxes, заполненный последним render*.
    // ======================================================================
    getButtonAt(x, y, state, hasSave) {
        // Проверка попадания в хитбокс
        const hit = (id) => {
            const b = this._buttonHitboxes[id];
            if (!b) return false;
            if (b.circular) {
                const dx = x - b.x, dy = y - b.y;
                return dx * dx + dy * dy <= b.r * b.r;
            }
            return x >= b.x - b.w / 2 && x <= b.x + b.w / 2 &&
                   y >= b.y - b.h / 2 && y <= b.y + b.h / 2;
        };

        if (state === 'menu') {
            if (hit('play')) { this.pressButton('play'); return 'play'; }
            if (hasSave && hit('continue')) { this.pressButton('continue'); return 'continue'; }
            if (hit('shop')) { this.pressButton('shop'); return 'shop'; }
        } else if (state === 'pause') {
            if (hit('resume')) { this.pressButton('resume'); return 'resume'; }
            if (hit('shop')) { this.pressButton('shop'); return 'shop'; }
            if (hit('menu')) { this.pressButton('menu'); return 'menu'; }
        } else if (state === 'gameover') {
            if (hit('restart')) { this.pressButton('restart'); return 'restart'; }
            if (hit('menu')) { this.pressButton('menu'); return 'menu'; }
        } else if (state === 'shop') {
            if (hit('close')) { this.pressButton('close'); return 'close'; }
        } else if (state === 'levelComplete') {
            if (hit('next')) { this.pressButton('next'); return 'next'; }
        }
        return null;
    }

    // Плавный fade для перехода между экранами
    _renderTransitionFade() {
        if (this.transitionAlpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.transitionAlpha;
            this.ctx.fillStyle = MenuSystem.PALETTE.bg;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }
    }

    // Запуск перехода (вызывается извне при смене экрана)
    startTransition(direction) {
        this.transitionDirection = direction;
        if (direction > 0) this.transitionAlpha = 0;
    }
}


// Палитра — обычное статическое присвоение (без class field syntax),
// чтобы менюшка работала в старых WebView, в которые упакуют APK.
MenuSystem.PALETTE = {
    bg:           '#FFF8F0',  // нежно-кремовый
    bgTop:        '#FFFCF6',  // чуть светлее сверху для градиента
    bgShop:       '#F3F0FF',  // светло-лавандовый для гардероба
    text:         '#5C4438',  // тёплый коричневый (вместо чёрного)
    textSoft:     '#8B7568',
    accent:       '#E8A87C',  // приглушённый золотисто-оранжевый
    accentDark:   '#C97B53',
    peach1:       '#FFD4B8',  // верх градиента основной кнопки
    peach2:       '#FFB89A',  // низ градиента основной кнопки
    mint1:        '#B5E8D5',
    mint2:        '#8DD3B6',
    sky1:         '#C8E2F2',
    sky2:         '#A8CFE8',
    pink:         '#F8C8D0',
    cardBg:       '#FFFFFF',
    cardBorder:   '#F0E6DC',
    cardShadow:   'rgba(92, 68, 56, 0.10)',
    gold:         '#E8B770'
};
