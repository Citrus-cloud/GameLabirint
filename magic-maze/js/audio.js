// Файл: magic-maze/js/audio.js
// Звуковые эффекты через Web Audio API

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
    }

    // Инициализация AudioContext (вызывается после пользовательского взаимодействия)
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API не поддерживается:', e);
            this.enabled = false;
        }
    }

    // Убедиться, что контекст активен
    _ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // === ЗВУК СБОРА КРИСТАЛЛА (мелодичный дзынь) ===
    playCrystalCollect() {
        if (!this.enabled) return;
        this._ensureContext();
        
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
        if (!this.enabled) return;
        this._ensureContext();
        
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
        
        // Шум
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = this.ctx.createBufferSource();
        const noiseGain = this.ctx.createGain();
        noise.buffer = buffer;
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
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
        if (!this.enabled) return;
        this._ensureContext();
        
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
}
