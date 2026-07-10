/**
 * Aegis AI Audio and Voice Announcement Service
 * Uses Web Audio API for custom synthesized chime alerts (no external file dependencies)
 * Uses Web Speech API (SpeechSynthesis) for personalized, natural spoken announcements.
 */
const AudioService = {
    audioCtx: null,

    /**
     * Initializes the AudioContext on first user interaction to bypass browser autoplay policies.
     */
    initContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    /**
     * Synthesizes a gentle, premium notification chime arpeggio (C5 -> E5 -> G5)
     */
    playChime() {
        try {
            this.initContext();
            const now = this.audioCtx.currentTime;

            // Arpeggio notes: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
            const notes = [523.25, 659.25, 783.99];
            const noteDuration = 0.12;

            notes.forEach((freq, index) => {
                const startTime = now + (index * noteDuration);
                const stopTime = startTime + 0.5;

                // Create oscillator
                const osc = this.audioCtx.createOscillator();
                osc.type = 'triangle'; // Smoother tone than sine or square
                osc.frequency.setValueAtTime(freq, startTime);

                // Create gain node for envelope
                const gainNode = this.audioCtx.createGain();
                gainNode.gain.setValueAtTime(0.001, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + 0.04); // Quick attack
                gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime); // Smooth decay

                // Connect nodes
                osc.connect(gainNode);
                gainNode.connect(this.audioCtx.destination);

                // Start and Stop
                osc.start(startTime);
                osc.stop(stopTime);
            });
        } catch (e) {
            console.error("AudioService: Failed to play synthesized chime", e);
        }
    },

    /**
     * Plays a deep warning sound for safety alerts or failures
     */
    playWarningSound() {
        try {
            this.initContext();
            const now = this.audioCtx.currentTime;
            
            const osc = this.audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.4);

            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);

            const gain = this.audioCtx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {
            console.error("AudioService: Failed to play warning sound", e);
        }
    },

    /**
     * Speaks a phrase aloud using SpeechSynthesis
     * @param {string} text - Message to speak
     * @param {string} voiceURI - Selected voice URI (optional)
     */
    speak(text, voiceURI = null) {
        if (!('speechSynthesis' in window)) {
            console.warn("AudioService: Speech synthesis not supported by this browser.");
            return;
        }

        // Cancel any active speech to avoid overlap
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Slightly slower for clear instruction
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (voiceURI) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        window.speechSynthesis.speak(utterance);
    },

    /**
     * Returns a list of available system voices
     * @returns {Promise<SpeechSynthesisVoice[]>}
     */
    getVoices() {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve([]);
                return;
            }
            
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                resolve(voices);
                return;
            }

            // Chrome loads voices asynchronously
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve(voices);
            };
        });
    }
};

// Bind to window to avoid CORS imports issues on local loading
window.AudioService = AudioService;
