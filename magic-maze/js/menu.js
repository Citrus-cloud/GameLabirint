// Файл: magic-maze/js/menu.js
// Тёмная уютная тема для всех меню: глубокий индиго-фиолет, мягкие светлые
// акценты, никакой агрессивной яркости. Стиль — минималистичный, детский,
// но «дорогой» (без неоновых теней, без размытия текста).
//
// Палитра (см. MenuSystem.PALETTE внизу файла):
//   фон:        #1A1238 → #0F0A22 (вертикальный градиент)
//   карточка:   #2A1F4E (мягкий пурпур) с тонким светлым ободком
//   персик:     #FFB088 / #FF8E66 (основная кнопка — приглушённо-тёплая)
//   мята:       #7DD3B5 / #4FC0A0 (вторичная кнопка — спокойная)
//   небо:       #8DB4E8 / #6890CC (информационная)
//   текст:      #F0EAFB (тёплый светло-сиреневый)
//   текст soft: #B5A6D8
//   акцент:     #FFD49B (мягкий тёплый «свечной» — для названия)
//   золото:     #FFD27A (для активного скина)
//
// Принципы:
//   - shadowBlur НИКОГДА не применяется к fillText (это и давало «мутный» вид).
//     Глубина текста — только смещённая тень, или подложка, или контур.
//   - Все кнопки имеют функцию _fitText, которая автоматически уменьшает
//     шрифт, если текст не влезает в кнопку. Никакого «вылезания».
//   - Минимум одновременных движений: 2 облачка + 2 звёздочки.
//   - Все экраны (main, pause, gameover, levelComplete, shop, levelIntro)
//     используют общий стиль карточки и кнопки.

class MenuSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;

        // === Фоновые элементы (минимум) ===
        // 2 облачка плывут слева направо, 2 звёздочки мерцают.
        this.clouds = [
            { x: 100, y: 90,  w: 70, opacity: 0.18, speed: 0.012 },
            { x: 320, y: 150, w: 55, opacity: 0.12, speed: 0.008 }
        ];
        this.stars = [
            { x: 60,  y: 200, size: 3,   phase: 0,        speed: 0.0015 },
            { x: 440, y: 240, size: 2.5, phase: Math.PI,  speed: 0.0018 }
        ];

        // === Анимация лисёнка на стартовом экране ===
        this.foxyBobPhase = 0;     // лёгкое покачивание
        this.foxyWavePhase = 0;    // взмах лапкой
        this.foxyWaveCooldown = 5000;
        this._waveTimer = 0;

        // === Состояние нажатия кнопки (для тактильной обратной связи) ===
        this.pressedButtonId = null;
        this.pressAnimTimer = 0;

        // === Переход между экранами (fade) ===
        this.transitionAlpha = 0;
        this.transitionDirection = 0;

        // Кеш позиций кнопок: заполняется в каждом render*
        // и используется в getButtonAt() для попадания.
        this._buttonHitboxes = {};
        // Кеш позиций карточек скинов (для шопа). id → {x,y,w,h}.
        this._shopSkinHitboxes = [];
    }

    // ======================================================================
    // ОБНОВЛЕНИЕ ФОНА (вызывается из game loop)
    // ======================================================================
    updateBackground(deltaTime) {
        // Облачка плывут вправо
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
        // Анимация нажатия кнопки (~120 мс)
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

    pressButton(id) {
        this.pressedButtonId = id;
        this.pressAnimTimer = 120;
    }

    // ======================================================================
    // ЧИСТЫЙ ШРИФТОВЫЙ СТЕК (без Comic Sans — он часто отсутствует на
    // мобильных и заменяется системным, что даёт «мыло»). Берём системный
    // sans-serif с округлыми акцентами.
    // ======================================================================
    _font(size, weight = 'bold') {
        return `${weight} ${size}px "Nunito", "Quicksand", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    }

    // Helper: подбирает максимальный размер шрифта (от desired до min),
    // при котором текст влезает в ширину maxWidth. Возвращает строку для ctx.font.
    _fitText(text, maxWidth, desiredSize, minSize = 11, weight = 'bold') {
        const ctx = this.ctx;
        let size = desiredSize;
        ctx.font = this._font(size, weight);
        while (size > minSize && ctx.measureText(text).width > maxWidth) {
            size -= 1;
            ctx.font = this._font(size, weight);
        }
        return this._font(size, weight);
    }

    // Усечение текста с многоточием, если даже минимальный шрифт не влезает.
    _ellipsize(text, maxWidth) {
        const ctx = this.ctx;
        if (ctx.measureText(text).width <= maxWidth) return text;
        let s = text;
        while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) {
            s = s.slice(0, -1);
        }
        return s + '…';
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

    // Маленькие плывущие облачка (мягкие сиреневые сгустки на тёмном фоне)
    _drawClouds() {
        const ctx = this.ctx;
        ctx.save();
        for (const c of this.clouds) {
            ctx.globalAlpha = c.opacity;
            ctx.fillStyle = '#B5A6D8';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.w * 0.35, 0, Math.PI * 2);
            ctx.arc(c.x + c.w * 0.35, c.y - c.w * 0.05, c.w * 0.4, 0, Math.PI * 2);
            ctx.arc(c.x + c.w * 0.7, c.y, c.w * 0.32, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Мерцающие звёздочки — тёплый кремовый оттенок
    _drawStars() {
        const ctx = this.ctx;
        ctx.save();
        for (const s of this.stars) {
            const brightness = 0.45 + (Math.sin(s.phase) * 0.5 + 0.5) * 0.55;
            ctx.globalAlpha = brightness;
            ctx.fillStyle = MenuSystem.PALETTE.accent;
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
    // СКРУГЛЁННЫЙ ПРЯМОУГОЛЬНИК
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
    // style: 'primary' (персик), 'secondary' (мята), 'soft' (светлая
    //        прозрачная для тёмного фона), 'sky' (небесная)
    // ======================================================================
    _drawSoftButton(x, y, w, h, text, style, id, options = {}) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const pressed = (this.pressedButtonId === id);
        const scale = pressed ? 0.96 : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Тень (мягкая, не неоновая, на тёмном фоне почти не видна — это ок)
        ctx.shadowColor = P.cardShadow;
        ctx.shadowBlur = pressed ? 4 : 10;
        ctx.shadowOffsetY = pressed ? 1 : 4;

        // Градиент по стилю
        let c1, c2, textColor;
        switch (style) {
            case 'primary':   c1 = P.peach1;  c2 = P.peach2;  textColor = '#3A1F12'; break;
            case 'secondary': c1 = P.mint1;   c2 = P.mint2;   textColor = '#0F2E22'; break;
            case 'soft':      c1 = P.softBtn1;c2 = P.softBtn2;textColor = P.text;   break;
            case 'sky':       c1 = P.sky1;    c2 = P.sky2;    textColor = '#0F1E36'; break;
            default:          c1 = P.peach1;  c2 = P.peach2;  textColor = '#3A1F12';
        }
        const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);

        const r = options.radius != null ? options.radius : Math.min(28, h / 2);
        this._roundedRect(-w / 2, -h / 2, w, h, r);
        ctx.fillStyle = grad;
        ctx.fill();

        // Тонкий блик сверху (1/3 высоты, мягкий — не агрессивный)
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = style === 'soft' ? 0.18 : 0.28;
        ctx.fillStyle = '#FFFFFF';
        this._roundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.35, r * 0.7);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Тонкий ободок 1px — придаёт «дороговизны»
        ctx.strokeStyle = style === 'soft' ? P.cardBorder : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        this._roundedRect(-w / 2, -h / 2, w, h, r);
        ctx.stroke();

        // Вспышка нажатия
        if (pressed) {
            ctx.globalAlpha = 0.20 * (this.pressAnimTimer / 120);
            ctx.fillStyle = '#FFFFFF';
            this._roundedRect(-w / 2, -h / 2, w, h, r);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Текст: подбираем размер шрифта так, чтобы влез в ширину кнопки
        // (макс. ширина — это w минус padding 22px). НИКАКОГО shadowBlur — он
        // и был причиной «мутности».
        const desired = options.fontSize || 22;
        const minSize = options.minFontSize || 13;
        const padding = options.textPadding != null ? options.textPadding : 22;
        ctx.font = this._fitText(text, w - padding, desired, minSize);
        const drawText = this._ellipsize(text, w - padding);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drawText, 0, 1);
        ctx.textBaseline = 'alphabetic';

        ctx.restore();

        // Хитбокс (для попадания тапов)
        this._buttonHitboxes[id] = { x, y, w, h };
    }

    // Маленькая круглая кнопка (для гардероба, закрытия)
    _drawCircleButton(x, y, r, icon, id, color) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        if (!color) color = P.sky1;
        const pressed = (this.pressedButtonId === id);
        const scale = pressed ? 0.9 : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.shadowColor = P.cardShadow;
        ctx.shadowBlur = pressed ? 3 : 8;
        ctx.shadowOffsetY = pressed ? 1 : 3;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Иконка (без shadowBlur)
        ctx.fillStyle = '#0F0A22';
        ctx.font = this._font(Math.round(r * 1.05), 'bold');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 1);
        ctx.textBaseline = 'alphabetic';

        ctx.restore();
        this._buttonHitboxes[id] = { x, y, w: r * 2, h: r * 2, circular: true, r };
    }

    // ======================================================================
    // ЛИСЁНОК ДЛЯ МЕНЮ (без изменений по форме — только тень адаптирована
    // под тёмный фон)
    // ======================================================================
    _drawCuteFoxy(x, y, scale, activeSkin, options = {}) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const size = 28 * scale;

        const bodyColor  = activeSkin ? activeSkin.bodyColor  : '#F5A878';
        const bellyColor = activeSkin ? activeSkin.bellyColor : '#FFEDD5';
        const tailColor  = activeSkin ? activeSkin.tailColor  : '#E89060';
        const earsColor  = activeSkin ? activeSkin.earsColor  : '#D87850';

        const bob = options.bob != null ? options.bob : Math.sin(this.foxyBobPhase) * 3;
        const drawY = y + bob;

        ctx.save();

        // Тень под лисёнком — на тёмном фоне делаем чуть прозрачную
        ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
        ctx.beginPath();
        ctx.ellipse(x, drawY + size * 1.3, size * 0.7, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Хвост
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

        // Ушки округлые
        ctx.fillStyle = earsColor;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.32, headY - size * 0.32, size * 0.15, size * 0.22, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + size * 0.32, headY - size * 0.32, size * 0.15, size * 0.22, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = P.pink;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.32, headY - size * 0.30, size * 0.07, size * 0.12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + size * 0.32, headY - size * 0.30, size * 0.07, size * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Щёчки
        ctx.fillStyle = 'rgba(248, 200, 208, 0.7)';
        ctx.beginPath();
        ctx.arc(x - size * 0.25, headY + size * 0.18, size * 0.13, 0, Math.PI * 2);
        ctx.arc(x + size * 0.25, headY + size * 0.18, size * 0.13, 0, Math.PI * 2);
        ctx.fill();

        // Глазки
        const emotion = options.emotion || 'normal';
        ctx.fillStyle = '#3D2B1F';
        if (emotion === 'sad') {
            ctx.lineWidth = size * 0.06;
            ctx.strokeStyle = '#3D2B1F';
            ctx.beginPath();
            ctx.arc(x - size * 0.20, headY + size * 0.02, size * 0.10, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + size * 0.20, headY + size * 0.02, size * 0.10, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x - size * 0.20, headY, size * 0.09, 0, Math.PI * 2);
            ctx.arc(x + size * 0.20, headY, size * 0.09, 0, Math.PI * 2);
            ctx.fill();
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

        // Машущая лапка
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
    // КАРТОЧКА (для центральных диалогов)
    // ======================================================================
    _drawCard(x, y, w, h) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = P.cardBg;
        this._roundedRect(x, y, w, h, 22);
        ctx.fill();
        ctx.restore();
        // Тонкий светлый ободок (1px) — выделяет карточку на тёмном фоне
        ctx.strokeStyle = P.cardBorder;
        ctx.lineWidth = 1;
        this._roundedRect(x, y, w, h, 22);
        ctx.stroke();
    }

    // ======================================================================
    // ГЛАВНОЕ МЕНЮ
    // ======================================================================
    renderMainMenu(hasSave, crystalBalance, activeSkin) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;
        this._buttonHitboxes = {};

        // 1. Тёмный фон
        this._drawSoftBackground();

        // 2. Облачка и звёздочки
        this._drawClouds();
        this._drawStars();

        // 3. Название игры — крупный, чёткий, без shadowBlur.
        //    Размер шрифта подгоняется под ширину canvas, чтобы текст
        //    никогда не вылезал за края.
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = this._fitText('Сказочный Лабиринт', w - 40, 32, 22);
        // Тёплый акцент с лёгкой смещённой тенью (без блюра)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillText('Сказочный Лабиринт', w / 2, 91);
        ctx.fillStyle = P.accent;
        ctx.fillText('Сказочный Лабиринт', w / 2, 90);
        // Подзаголовок
        ctx.font = this._fitText('Магия процедурных миров', w - 60, 14, 11, 'normal');
        ctx.fillStyle = P.textSoft;
        ctx.fillText('Магия процедурных миров', w / 2, 118);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // 4. Лисёнок
        const foxyY = Math.min(250, h * 0.36);
        this._drawCuteFoxy(w / 2, foxyY, 1.4, activeSkin, { waving: true });

        // 5. Pill с балансом кристаллов
        if (crystalBalance > 0) {
            ctx.save();
            const pillW = 90, pillH = 28;
            const pillX = w / 2 - pillW / 2;
            const pillY = 142;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
            this._roundedRect(pillX, pillY, pillW, pillH, 14);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 1;
            this._roundedRect(pillX, pillY, pillW, pillH, 14);
            ctx.stroke();
            ctx.font = this._font(13, 'bold');
            ctx.fillStyle = P.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`💎 ${crystalBalance}`, w / 2, pillY + pillH / 2 + 1);
            ctx.textBaseline = 'alphabetic';
            ctx.restore();
        }

        // 6. Кнопки.
        //    Координаты адаптируются под высоту, чтобы на узких/коротких
        //    мобильных экранах ничего не выпало за нижний край.
        const baseY = Math.max(420, h - (hasSave ? 220 : 170));
        const mainW = Math.min(220, w - 100);
        const mainH = 60;
        this._drawSoftButton(w / 2, baseY, mainW, mainH, 'Играть', 'primary', 'play',
            { fontSize: 24 });

        let nextY = baseY + 75;
        if (hasSave) {
            this._drawSoftButton(w / 2, nextY, Math.min(190, w - 120), 48,
                'Продолжить', 'soft', 'continue', { fontSize: 20 });
            nextY += 60;
        }

        // Гардероб — кружок справа от главной кнопки
        this._drawCircleButton(
            w / 2 + mainW / 2 + 28, baseY,
            22, '★', 'shop', P.mint1
        );
        // Подпись
        ctx.save();
        ctx.font = this._font(11, 'bold');
        ctx.fillStyle = P.textSoft;
        ctx.textAlign = 'center';
        ctx.fillText('Гардероб', w / 2 + mainW / 2 + 28, baseY + 40);
        ctx.restore();

        // Подвал
        ctx.save();
        ctx.font = this._font(10, 'normal');
        ctx.fillStyle = P.textSoft;
        ctx.globalAlpha = 0.55;
        ctx.textAlign = 'center';
        ctx.fillText('Для маленьких искателей приключений', w / 2, h - 18);
        ctx.restore();

        this._renderTransitionFade();
    }

    // ======================================================================
    // ЭКРАН ПАУЗЫ
    // ======================================================================
    renderPauseScreen() {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;
        this._buttonHitboxes = {};

        // Тёмный полупрозрачный overlay поверх игры
        ctx.fillStyle = 'rgba(15, 10, 34, 0.70)';
        ctx.fillRect(0, 0, w, h);

        // Карточка
        const cardW = Math.min(280, w - 40);
        const cardH = 290;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2;
        this._drawCard(cardX, cardY, cardW, cardH);

        // Заголовок «Пауза»
        ctx.save();
        ctx.font = this._font(28, 'bold');
        ctx.fillStyle = P.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Пауза', w / 2, cardY + 40);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // Маленький лисёнок
        this._drawCuteFoxy(w / 2, cardY + 88, 0.7, null);

        // Кнопки в столбик. Ширина кнопок — относительно карточки.
        const btnW = cardW - 40;
        const btnH = 46;
        const btnX = w / 2;
        let btnY = cardY + 152;
        this._drawSoftButton(btnX, btnY, btnW, btnH, 'Продолжить', 'primary', 'resume',
            { fontSize: 20 });
        btnY += 56;
        this._drawSoftButton(btnX, btnY, btnW, btnH, 'Гардероб', 'soft', 'shop',
            { fontSize: 18 });
        btnY += 56;
        this._drawSoftButton(btnX, btnY, btnW, btnH, 'В меню', 'soft', 'menu',
            { fontSize: 18 });
    }

    // ======================================================================
    // ЭКРАН ПРОИГРЫША
    // ======================================================================
    renderGameOver(score, level, highScore, activeSkin) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;
        this._buttonHitboxes = {};

        this._drawSoftBackground();
        this._drawClouds();
        this._drawStars();

        const cardW = Math.min(320, w - 30);
        const cardH = 380;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2 - 10;
        this._drawCard(cardX, cardY, cardW, cardH);

        // Грустный лисёнок
        this._drawCuteFoxy(w / 2, cardY + 78, 1.0, activeSkin, { emotion: 'sad' });

        // Подбадривающее сообщение
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = this._fitText('Не расстраивайся!', cardW - 30, 24, 18);
        ctx.fillStyle = P.text;
        ctx.fillText('Не расстраивайся!', w / 2, cardY + 188);
        ctx.font = this._fitText('У тебя всё получится', cardW - 40, 15, 12, 'normal');
        ctx.fillStyle = P.textSoft;
        ctx.fillText('У тебя всё получится', w / 2, cardY + 215);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // Статистика — пара pill-блоков
        ctx.save();
        const statsY = cardY + 245;
        const statW = (cardW - 50) / 3;
        const statH = 44;
        const statSpacing = 10;
        const startX = cardX + 25;
        const drawStat = (i, label, value, color) => {
            const x = startX + i * (statW + statSpacing);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
            this._roundedRect(x, statsY, statW, statH, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            this._roundedRect(x, statsY, statW, statH, 10);
            ctx.stroke();
            ctx.font = this._font(9, 'normal');
            ctx.fillStyle = P.textSoft;
            ctx.textAlign = 'center';
            ctx.fillText(label, x + statW / 2, statsY + 14);
            ctx.font = this._fitText(value, statW - 8, 15, 11);
            ctx.fillStyle = color;
            ctx.fillText(value, x + statW / 2, statsY + 32);
        };
        drawStat(0, 'УРОВЕНЬ', String(level), P.text);
        drawStat(1, 'ОЧКИ',    String(score),   P.accent);
        drawStat(2, 'РЕКОРД',  String(highScore), P.gold);
        ctx.restore();

        // Кнопки
        this._drawSoftButton(w / 2, cardY + 322, Math.min(200, cardW - 40), 50,
            'Заново', 'primary', 'restart', { fontSize: 22 });
        this._drawSoftButton(w / 2, cardY + 365, Math.min(150, cardW - 60), 36,
            'В меню', 'soft', 'menu', { fontSize: 16 });
    }

    // ======================================================================
    // ЭКРАН ЗАВЕРШЕНИЯ УРОВНЯ
    // ======================================================================
    renderLevelComplete(score, level, activeSkin) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;
        this._buttonHitboxes = {};

        this._drawSoftBackground();
        this._drawClouds();

        const cardW = Math.min(300, w - 30);
        const cardH = 320;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2;
        this._drawCard(cardX, cardY, cardW, cardH);

        this._drawCuteFoxy(w / 2, cardY + 80, 1.0, activeSkin);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = this._fitText('Молодец!', cardW - 30, 26, 20);
        ctx.fillStyle = P.accent;
        ctx.fillText('Молодец!', w / 2, cardY + 188);
        ctx.font = this._fitText(
            `Уровень ${level} пройден • ${score} очков`, cardW - 30, 14, 11, 'normal');
        ctx.fillStyle = P.textSoft;
        ctx.fillText(`Уровень ${level} пройден • ${score} очков`, w / 2, cardY + 215);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        this._drawSoftButton(w / 2, cardY + 270, Math.min(200, cardW - 40), 50,
            'Дальше', 'primary', 'next', { fontSize: 22 });
    }

    // ======================================================================
    // ЭКРАН-ИНТРО ПЕРЕД УРОВНЕМ
    // ======================================================================
    renderLevelIntro(level, progress) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;

        this._drawSoftBackground();

        const scale = 0.7 + progress * 0.4;
        const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.font = this._font(48, 'bold');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Смещённая тень вместо блюра
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillText(`Уровень ${level}`, 2, 3);
        ctx.fillStyle = P.accent;
        ctx.fillText(`Уровень ${level}`, 0, 0);
        if (level % 10 === 0) {
            ctx.font = this._font(18, 'bold');
            ctx.fillStyle = P.textSoft;
            ctx.fillText('Хранитель ждёт!', 0, 50);
        }
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    // ======================================================================
    // ГАРДЕРОБ
    // Сетка карточек скинов адаптируется под ширину экрана.
    // Хитбоксы карточек сохраняются в _shopSkinHitboxes, чтобы main.js
    // мог корректно определять, по какой карточке тапнули, без рассинхрона
    // с раскладкой (старый shop.handleClick использовал устаревшие коорд.).
    // ======================================================================
    renderShop(shop, time) {
        const ctx = this.ctx;
        const P = MenuSystem.PALETTE;
        const w = this.width;
        const h = this.height;
        this._buttonHitboxes = {};
        this._shopSkinHitboxes = [];

        // Тёмный фон с лёгким лавандовым оттенком (отличает от главного меню)
        this._drawSoftBackground(P.bgShop, P.bgShopTop);

        // Едва заметные «облачка» внизу — мягко обогащают композицию
        ctx.save();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = '#B5A6D8';
        ctx.beginPath();
        ctx.arc(40, h - 50, 60, 0, Math.PI * 2);
        ctx.arc(w - 50, h - 70, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Заголовок
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = this._fitText('Гардероб', w - 100, 24, 18);
        ctx.fillStyle = P.accent;
        ctx.fillText('Гардероб', w / 2, 42);
        ctx.font = this._font(13, 'bold');
        ctx.fillStyle = P.textSoft;
        ctx.fillText(`💎 ${shop.getCrystals()}`, w / 2, 65);
        ctx.restore();

        // Кнопка закрытия (← в круге)
        this._drawCircleButton(28, 32, 20, '←', 'close', P.sky1);

        // Сетка скинов — 2 колонки, адаптивная высота карточки
        const gridStartX = 16;
        const gridStartY = 86;
        const gap = 12;
        const cellW = (w - gridStartX * 2 - gap) / 2;
        // Высота карточки: достаточно, чтобы влезли превью + 3 строки текста
        const cellH = 116;

        for (let i = 0; i < SKINS_DATA.length; i++) {
            const skin = SKINS_DATA[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = gridStartX + col * (cellW + gap);
            const cy = gridStartY + row * (cellH + gap) - shop.scrollOffset;

            // Сохраняем хитбокс ВСЕГДА (даже если не видно — не страшно,
            // тап вне видимой области не дойдёт)
            this._shopSkinHitboxes.push({ id: i, x: cx, y: cy, w: cellW, h: cellH });

            // Skip отрисовку, если за пределами видимости
            if (cy + cellH < 76 || cy > h - 30) continue;

            const isOwned = shop.isOwned(i);
            const isActive = shop.activeSkinId === i;
            const canBuy = shop.canBuy(i);

            // Карточка — тёмная подложка с лёгким светлым ободком
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = isActive ? 14 : 8;
            ctx.shadowOffsetY = 3;
            ctx.fillStyle = P.cardBg;
            this._roundedRect(cx, cy, cellW, cellH, 14);
            ctx.fill();
            ctx.restore();

            // Рамка
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

            // Превью или знак вопроса
            const previewX = cx + 36;
            const previewY = cy + cellH / 2;
            if (isOwned || canBuy) {
                this._drawMiniSkin(previewX, previewY, skin);
            } else {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                ctx.beginPath();
                ctx.arc(previewX, previewY, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = this._font(22, 'bold');
                ctx.fillStyle = P.textSoft;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', previewX, previewY + 1);
                ctx.textBaseline = 'alphabetic';
                ctx.restore();
            }

            // Текстовая часть карточки
            const textX = cx + 68;
            const textW = cellW - 78;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';

            // Название скина — авто-подгонка по ширине
            ctx.font = this._fitText(skin.name, textW, 13, 10);
            ctx.fillStyle = P.text;
            ctx.fillText(this._ellipsize(skin.name, textW), textX, cy + 26);

            // Статус
            ctx.font = this._font(10, 'bold');
            let statusText, statusColor;
            if (isActive) {
                statusText = '✓ Надето';
                statusColor = P.gold;
            } else if (isOwned) {
                statusText = 'Нажми, чтобы надеть';
                statusColor = P.mint2;
            } else {
                statusText = `💎 ${skin.price}`;
                statusColor = canBuy ? P.accent : P.textSoft;
            }
            ctx.fillStyle = statusColor;
            ctx.fillText(this._ellipsize(statusText, textW), textX, cy + 46);

            // Описание (короткое)
            ctx.font = this._font(9, 'normal');
            ctx.fillStyle = P.textSoft;
            const desc = this._ellipsize(skin.description, textW);
            ctx.fillText(desc, textX, cy + 64);

            // Звёзды тира
            ctx.font = this._font(10, 'bold');
            for (let s = 0; s < skin.tier; s++) {
                ctx.fillStyle = isOwned ? P.gold : 'rgba(255, 210, 122, 0.30)';
                ctx.fillText('★', textX + s * 11, cy + cellH - 12);
            }
        }

        // Подсказка в подвале
        ctx.save();
        ctx.font = this._font(11, 'bold');
        ctx.fillStyle = P.textSoft;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.65;
        ctx.fillText('Собирай кристаллы в лабиринтах!', w / 2, h - 14);
        ctx.restore();

        ctx.textAlign = 'left';
    }

    // Маленький лисёнок-превью
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
        // Ушки
        ctx.fillStyle = skin.earsColor;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.3, y - size * 0.75, size * 0.13, size * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + size * 0.3, y - size * 0.75, size * 0.13, size * 0.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Глазки
        ctx.fillStyle = '#1A0A2E';
        ctx.beginPath();
        ctx.arc(x - size * 0.18, y - size * 0.45, size * 0.07, 0, Math.PI * 2);
        ctx.arc(x + size * 0.18, y - size * 0.45, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
    }

    // ======================================================================
    // ОПРЕДЕЛЕНИЕ КНОПКИ ПО КООРДИНАТАМ
    // ======================================================================
    getButtonAt(x, y, state, hasSave) {
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

    // Возвращает id скина под курсором (или null), используя кеш карточек
    // из последней отрисовки renderShop. Это устраняет рассинхрон между
    // визуальной раскладкой и обработкой кликов.
    getShopSkinAt(x, y) {
        for (const b of this._shopSkinHitboxes) {
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                return b.id;
            }
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

    startTransition(direction) {
        this.transitionDirection = direction;
        if (direction > 0) this.transitionAlpha = 0;
    }
}


// ============================================================================
// ПАЛИТРА — тёмная уютная тема (deep purple/indigo + soft warm accents).
// Используется во всех меню. Меняется один раз — обновляет всю игру.
// ============================================================================
MenuSystem.PALETTE = {
    // Фон главного экрана: глубокий индиго → тёмно-фиолетовый сверху
    bg:           '#0F0A22',
    bgTop:        '#1A1238',
    // Гардероб: чуть более «королевский» лавандовый оттенок
    bgShop:       '#0F0A26',
    bgShopTop:    '#1F1545',

    // Текст: тёплый светло-сиреневый (не чисто-белый — мягче для глаз)
    text:         '#F0EAFB',
    textSoft:     '#B5A6D8',

    // Карточки и ободки
    cardBg:       '#241A47',           // Тёмно-фиолетовый (на 1 шаг светлее фона)
    cardBorder:   'rgba(255, 255, 255, 0.10)',
    cardShadow:   'rgba(0, 0, 0, 0.45)',

    // Тёплый акцент для названия и пр. (мягкий «свечной» цвет)
    accent:       '#FFD49B',
    accentDark:   '#E8A87C',
    gold:         '#FFD27A',

    // Кнопки: основная (тёплый персик)
    peach1:       '#FFB088',
    peach2:       '#FF8E66',
    // Вторичная (приглушённая мята)
    mint1:        '#7DD3B5',
    mint2:        '#4FC0A0',
    // Информационная (небо)
    sky1:         '#8DB4E8',
    sky2:         '#6890CC',
    // Розовый акцент (внутренность ушек, щёчки)
    pink:         '#F8C8D0',
    // «soft»-кнопка для тёмной темы — полупрозрачная подложка
    softBtn1:     'rgba(255, 255, 255, 0.12)',
    softBtn2:     'rgba(255, 255, 255, 0.06)'
};
