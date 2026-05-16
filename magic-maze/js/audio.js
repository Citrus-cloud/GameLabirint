// Файл: magic-maze/js/audio.js
// Звуковые эффекты через Web Audio API — ОПТИМИЗИРОВАНО
// Лимит одновременных звуков, переиспользование буферов шума,
// защита от утечек памяти

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;

        // Оптимизация: ограничение количества одновременных звуков
        this._activeSounds = 0;
        this._maxConcurrentSounds = 8; // Максимум 8 одновременных звуков

        // Кешированные буферы шума (создаются один раз)
        this._noiseBufferShort = null; // 0.2с
        this._noiseBufferLong = null;  // 0.6с
    }

    // Инициализация AudioContext
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            // Создаём буферы шума один раз
            this._createNoiseBuffers();
        } catch (e) {
            console.warn('Web Audio API не поддерживается:', e);
            this.enabled = false;
        }
    }

    // Создание переиспользуемых буферов шума
    _createNoiseBuffers() {
        if (!this.ctx) return;

        // Короткий шум (0.2с)
        const shortSize = Math.floor(this.ctx.sampleRate * 0.2);
        this._noiseBufferShort = this.ctx.createBuffer(1, shortSize, this.ctx.sampleRate);
        const shortData = this._noiseBufferShort.getChannelData(0);
        for (let i = 0; i < shortSize; i++) {
            shortData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (shortSize * 0.3));
        }

        // Длинный шум (0.6с)
        const longSize = Math.floor(this.ctx.sampleRate * 0.6);
        this._noiseBufferLong = this.ctx.createBuffer(1, longSize, this.ctx.sampleRate);
        const longData = this._noiseBufferLong.getChannelData(0);
        for (let i = 0; i < longSize; i++) {
            const decay = Math.exp(-i / (longSize * 0.15));
            const crackle = Math.random() < 0.03 ? 2.5 : 1;
            longData[i] = (Math.random() * 2 - 1) * decay * crackle;
        }
    }

    // Убедиться, что контекст активен
    _ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Проверка: можно ли воспроизвести ещё один звук
    _canPlay() {
        return this._activeSounds < this._maxConcurrentSounds;
    }

    // Отслеживание активных звуков
    _trackSound(duration) {
        this._activeSounds++;
        setTimeout(() => {
            this._activeSounds = Math.max(0, this._activeSounds - 1);
        }, duration);
    }

    // === ЗВУК СБОРА КРИСТАЛЛА (мелодичный дзынь) ===
    playCrystalCollect() {
        if (!this.enabled || !this._canPlay()) return;
        this._ensureContext();
        this._trackSound(300);
        
        const now = this.ctx.currentTime;
        
        // Основной тон
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);
        
        // Гармоника
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.15);
        gain2.gain.setValueAtTime(0.15, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.25);
    }

    // === ЗВУК ПОЛУЧЕНИЯ УРОНА (глухой удар) ===
    playDamage() {
        if (!this.enabled || !this._canPlay()) return;
        this._ensureContext();
        this._trackSound(300);
        
        const now = this.ctx.currentTime;
        
        // Низкий удар
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        
        // Шум (переиспользуем буфер)
        if (this._noiseBufferShort) {
            const noise = this.ctx.createBufferSource();
            const noiseGain = this.ctx.createGain();
            noise.buffer = this._noiseBufferShort;
            noiseGain.gain.setValueAtTime(0.2, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            noise.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
        }
    }

    // === ЗВУК ПОБЕДЫ / ЗАВЕРШЕНИЯ УРОВНЯ (фанфары) ===
    playLevelComplete() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0, now + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.5);
        });
        
        // Финальный аккорд
        const chordTime = now + notes.length * 0.12 + 0.1;
        [523, 659, 784].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, chordTime);
            gain.gain.setValueAtTime(0.15, chordTime);
            gain.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.8);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(chordTime);
            osc.stop(chordTime + 0.8);
        });
    }

    // === ЗВУК ПОДБОРА УСИЛЕНИЯ ===
    playPowerUp() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Восходящая нота
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        
        // Звон
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now + 0.1);
        gain2.gain.setValueAtTime(0.1, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.5);
    }

    // === ЗВУК ВХОДА В ПОРТАЛ ===
    playPortalEnter() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Нисходящая спираль
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        
        // Воссоздание shimmer
        for (let i = 0; i < 5; i++) {
            const shimmer = this.ctx.createOscillator();
            const sGain = this.ctx.createGain();
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(2000 + i * 300, now + i * 0.08);
            sGain.gain.setValueAtTime(0.05, now + i * 0.08);
            sGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
            shimmer.connect(sGain);
            sGain.connect(this.ctx.destination);
            shimmer.start(now + i * 0.08);
            shimmer.stop(now + i * 0.08 + 0.2);
        }
    }

    // === МЕЛОДИЯ БОНУС-КОМНАТЫ ===
    playBonusRoomMelody() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        // Короткая радостная мелодия: До-Ми-Соль-До(выше)-Соль-Ми
        const melody = [523, 659, 784, 1047, 784, 659];
        
        melody.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.2, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.25);
        });
    }

    // === ЗВУК ДВИЖЕНИЯ ===
    playMove() {
        if (!this.enabled || !this._canPlay()) return;
        this._ensureContext();
        this._trackSound(80);
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Переключение звука
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // ======================================================================
    // ЗВУКИ МОЛНИИ (Удар молнии)
    // ======================================================================

    // === ЗВУК ЗАРЯДКИ МОЛНИИ (нарастающий низкий гул, 3 секунды) ===
    // Возвращает объект {stop} для остановки звука
    playLightningCharge() {
        if (!this.enabled) return { stop: () => {} };
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Низкий гул (осциллятор с повышением частоты)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(40, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 3);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.3, now + 2.5);
        gain.gain.linearRampToValueAtTime(0.35, now + 3);
        
        // Фильтр (приглушённый звук)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 3.5);
        
        // Суб-бас (дополнительная глубина)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(30, now);
        sub.frequency.linearRampToValueAtTime(60, now + 3);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.2, now + 1);
        subGain.gain.linearRampToValueAtTime(0.25, now + 3);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 3.5);
        
        return {
            stop: () => {
                try {
                    gain.gain.cancelScheduledValues(this.ctx.currentTime);
                    gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
                    subGain.gain.cancelScheduledValues(this.ctx.currentTime);
                    subGain.gain.setValueAtTime(subGain.gain.value, this.ctx.currentTime);
                    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
                } catch(e) {}
            }
        };
    }

    // === ЗВУК УДАРА МОЛНИИ (громкий треск + бас) ===
    playLightningStrike() {
        if (!this.enabled || !this._canPlay()) return;
        this._ensureContext();
        this._trackSound(600);
        
        const now = this.ctx.currentTime;
        
        // Треск (переиспользуем длинный буфер шума)
        if (this._noiseBufferLong) {
            const noise = this.ctx.createBufferSource();
            const noiseGain = this.ctx.createGain();
            const highFilter = this.ctx.createBiquadFilter();
            highFilter.type = 'highpass';
            highFilter.frequency.value = 2000;
            noise.buffer = this._noiseBufferLong;
            noiseGain.gain.setValueAtTime(0.5, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            noise.connect(highFilter);
            highFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
        }
        
        // Бас
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(300, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        bass.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bass.start(now);
        bass.stop(now + 0.6);
        
        // Средний треск
        const mid = this.ctx.createOscillator();
        const midGain = this.ctx.createGain();
        mid.type = 'square';
        mid.frequency.setValueAtTime(1500, now);
        mid.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        midGain.gain.setValueAtTime(0.3, now);
        midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        mid.connect(midGain);
        midGain.connect(this.ctx.destination);
        mid.start(now);
        mid.stop(now + 0.25);
    }

    // ======================================================================
    // ЗВУКИ СКИНОВ (при движении)
    // ======================================================================

    // Защита от слишком частого воспроизведения звуков скинов
    _lastSkinSoundTime = 0;
    _skinSoundInterval = 300; // мс

    _canPlaySkinSound() {
        const now = performance.now();
        if (now - this._lastSkinSoundTime < this._skinSoundInterval) return false;
        this._lastSkinSoundTime = now;
        return true;
    }

    // === Тир 2: Тихое магическое журчание при движении ===
    playSkinMagicRustle() {
        if (!this.enabled || !this._canPlaySkinSound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Лёгкий шепот (фильтрованный шум)
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5)) * 0.3;
        }
        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 2;
        noise.buffer = buffer;
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    // === Тир 3 огонь: Потрескивание огня ===
    playSkinFireCrackle() {
        if (!this.enabled || !this._canPlaySkinSound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Импульсный треск
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() < 0.1 ? (Math.random() * 2 - 1) : 0) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        noise.buffer = buffer;
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    // === Тир 3 лёд: Звон льдинок ===
    playSkinIceChime() {
        if (!this.enabled || !this._canPlaySkinSound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const freq = 2000 + Math.random() * 1500;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 0.1);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    // === Тир 4: Эмбиент с эхом ===
    playSkinAmbient() {
        if (!this.enabled || !this._canPlaySkinSound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Гулкий тон
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 + Math.random() * 100, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        
        // Эхо
        const echo = this.ctx.createOscillator();
        const echoGain = this.ctx.createGain();
        echo.type = 'sine';
        echo.frequency.setValueAtTime(180 + Math.random() * 80, now + 0.15);
        echoGain.gain.setValueAtTime(0.015, now + 0.15);
        echoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        echo.connect(echoGain);
        echoGain.connect(this.ctx.destination);
        echo.start(now + 0.15);
        echo.stop(now + 0.45);
    }

    // === Тир 5 Король теней: Низкий гул + удары сердца ===
    playSkinShadowPulse() {
        if (!this.enabled || !this._canPlaySkinSound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Низкий гул
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(45, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
        
        // Удар сердца
        const heart = this.ctx.createOscillator();
        const heartGain = this.ctx.createGain();
        heart.type = 'sine';
        heart.frequency.setValueAtTime(60, now + 0.05);
        heart.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        heartGain.gain.setValueAtTime(0.08, now + 0.05);
        heartGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        heart.connect(heartGain);
        heartGain.connect(this.ctx.destination);
        heart.start(now + 0.05);
        heart.stop(now + 0.25);
    }

    // === Тир 5 Создатель звёзд: Небесные перезвоны ===
    playSkinStarChime() {
        if (!this.enabled || !this._canPlaySkinSound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Хрустальные колокольчики (случайные ноты пентатоники)
        const notes = [1047, 1175, 1319, 1568, 1760, 2093]; // C6-пентатоника
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        
        // Обертон
        const harm = this.ctx.createOscillator();
        const harmGain = this.ctx.createGain();
        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 2, now + 0.02);
        harmGain.gain.setValueAtTime(0.02, now + 0.02);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        harm.connect(harmGain);
        harmGain.connect(this.ctx.destination);
        harm.start(now + 0.02);
        harm.stop(now + 0.25);
    }

    // ======================================================================
    // УЛУЧШЕНИЕ 3: Звуки эмоций лисёнка
    // Каждый звук — короткий, приятный для детей, не режет слух
    // ======================================================================

    // Защита от накладывания звуков (хранит время последнего звука)
    _lastSoundTime = 0;
    _minSoundInterval = 100; // мс между звуками

    _canPlaySound() {
        const now = performance.now();
        if (now - this._lastSoundTime < this._minSoundInterval) return false;
        this._lastSoundTime = now;
        return true;
    }

    // === ЗВУК РАДОСТИ при сборе кристалла (мелодичный «дзыынь!» с повышением тона) ===
    playEmotionHappy() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Основной восходящий тон
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1980, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        
        // Высокий звон (блеск)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2640, now + 0.1);
        gain2.gain.setValueAtTime(0.08, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.3);
    }

    // === ЗВУК УДИВЛЕНИЯ при сборе усиления (три быстрых восходящих ноты) ===
    playEmotionSurprised() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const notes = [523, 784, 1047]; // C5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.18);
        });
    }

    // === ЗВУК ИСПУГА при получении урона (низкий глухой «бум» с падением тона) ===
    playEmotionScared() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Глухой удар с падением
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        
        // Тревожный обертон
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(120, now);
        osc2.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.3);
    }

    // === ЗВУК ПОБЕДЫ при завершении уровня (триумфальная мелодия) ===
    playEmotionCelebrating() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        // Триумфальная фанфара: До-Ми-Соль-До(выше)
        const notes = [523, 659, 784, 1047, 1319];
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.25, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.35);
        });
        
        // Финальный аккорд
        const chordTime = now + 0.55;
        [523, 659, 784, 1047].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, chordTime);
            gain.gain.setValueAtTime(0.12, chordTime);
            gain.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(chordTime);
            osc.stop(chordTime + 0.7);
        });
    }

    // === ЗВУК ГРУСТИ при проигрыше (грустная нисходящая мелодия) ===
    playEmotionSad() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        // Нисходящая грустная мелодия: Ми-До-Ля
        const notes = [659, 523, 440];
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.25);
            gain.gain.setValueAtTime(0.2, now + i * 0.25);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.25);
            osc.stop(now + i * 0.25 + 0.45);
        });
    }

    // === ЗВУК ЗЕВОТЫ при бездействии (тихий, мягкий) ===
    playEmotionIdle() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Мягкий нисходящий тон (зевок)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.6);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
    }

    // ======================================================================
    // НОВЫЕ ЗВУКИ МЕХАНИК (Кристалл-непоседа, Призрачные стены, Цветок, Лихорадка, Туман)
    // ======================================================================

    // === ЗВУК ПОИМКИ КРИСТАЛЛА-НЕПОСЕДЫ (игривая восходящая мелодия + смешок) ===
    playCrystalRunnerCatch() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        // Три восходящих ноты (игривые)
        const notes = [659, 880, 1175]; // E5, A5, D6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.25, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.25);
        });
        
        // Короткий "смешок" (быстрые ноты)
        const giggleTime = now + 0.35;
        const giggles = [1320, 1100, 1320, 1100];
        giggles.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, giggleTime + i * 0.06);
            gain.gain.setValueAtTime(0.1, giggleTime + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, giggleTime + i * 0.06 + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(giggleTime + i * 0.06);
            osc.stop(giggleTime + i * 0.06 + 0.1);
        });
    }

    // === ЗВУК СМЕНЫ СОСТОЯНИЯ ПРИЗРАЧНОЙ СТЕНЫ (тихий перезвон) ===
    playGhostWallToggle() {
        if (!this.enabled || !this._canPlaySound()) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500 + Math.random() * 500, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    // === ЗВУК ЛИНЕЙНОЙ МОЛНИИ (более мощный удар с эхом) ===
    playLineLightningStrike() {
        if (!this.enabled || !this._canPlay()) return;
        this._ensureContext();
        this._trackSound(1100);
        
        const now = this.ctx.currentTime;
        
        // Усиленный треск (переиспользуем буфер)
        if (this._noiseBufferLong) {
            const noise = this.ctx.createBufferSource();
            const noiseGain = this.ctx.createGain();
            noise.buffer = this._noiseBufferLong;
            noiseGain.gain.setValueAtTime(0.6, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            noise.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
        }
        
        // Мощный бас
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(400, now);
        bass.frequency.exponentialRampToValueAtTime(25, now + 0.5);
        bassGain.gain.setValueAtTime(0.6, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        bass.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bass.start(now);
        bass.stop(now + 0.8);
        
        // Эхо
        const echo = this.ctx.createOscillator();
        const echoGain = this.ctx.createGain();
        echo.type = 'sine';
        echo.frequency.setValueAtTime(80, now + 0.3);
        echo.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        echoGain.gain.setValueAtTime(0.15, now + 0.3);
        echoGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        echo.connect(echoGain);
        echoGain.connect(this.ctx.destination);
        echo.start(now + 0.3);
        echo.stop(now + 1.1);
    }

    // === ЗВУК ТИКАНЬЯ ЧАСОВ ЦВЕТКА (щелчок каждую секунду) ===
    playFlowerTick() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // === ЗВУК СБОРА ЦВЕТКА (победная мелодия) ===
    playFlowerCollect() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047, 1319]; // C5-E5-G5-C6-E6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    }

    // === ЗВУК УВЯДАНИЯ ЦВЕТКА (грустный нисходящий) ===
    playFlowerWilt() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
    }

    // === ЗВУК НАЧАЛА КРИСТАЛЬНОЙ ЛИХОРАДКИ (фанфары + энергия) ===
    playCrystalFeverStart() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        // Фанфара
        const notes = [784, 988, 1175, 1568]; // G5, B5, D6, G6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.3, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.35);
        });
        
        // Финальный аккорд с блеском
        const chordTime = now + 0.5;
        [784, 988, 1175, 1568].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, chordTime);
            gain.gain.setValueAtTime(0.15, chordTime);
            gain.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.8);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(chordTime);
            osc.stop(chordTime + 0.9);
        });
    }

    // === ЗВУК ОКОНЧАНИЯ ЛИХОРАДКИ (затухающий перезвон) ===
    playCrystalFeverEnd() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        const notes = [1568, 1175, 988, 784]; // Нисходящее
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.15 - i * 0.03, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.35);
        });
    }

    // === ЗВУК ТУМАННОГО УРОВНЯ (приглушённый эмбиент при начале) ===
    playFogAmbient() {
        if (!this.enabled) return;
        this._ensureContext();
        
        const now = this.ctx.currentTime;
        
        // Низкий гул тумана
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(100, now + 2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.05, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 3);
        
        // Отдалённые перезвоны
        for (let i = 0; i < 4; i++) {
            const chime = this.ctx.createOscillator();
            const chimeGain = this.ctx.createGain();
            chime.type = 'sine';
            const freq = [1047, 1319, 1568, 2093][i];
            const delay = 0.5 + i * 0.4;
            chime.frequency.setValueAtTime(freq, now + delay);
            chimeGain.gain.setValueAtTime(0.03, now + delay);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
            chime.connect(chimeGain);
            chimeGain.connect(this.ctx.destination);
            chime.start(now + delay);
            chime.stop(now + delay + 0.6);
        }
    }

}
