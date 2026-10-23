let audioContext = null;
let ringTimer = null;

const playRing = () => {
  const now = audioContext.currentTime;
  [440, 480].forEach((frequency, i) => {
    const start = now + i * 0.25;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  });
  if (navigator.vibrate) navigator.vibrate([300, 200, 300]);
};

export function startRingtone() {
  stopRingtone();
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = audioContext || new AudioCtx();
    // Browsers may keep the context suspended until the user interacts with the page
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    playRing();
    ringTimer = setInterval(playRing, 2000);
  } catch (error) {
    console.warn('Ringtone unavailable:', error);
  }
}

export function stopRingtone() {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}
