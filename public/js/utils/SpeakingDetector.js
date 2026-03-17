const THRESHOLD = 30;
const VOICE_BINS = 64;

export function createSpeakingDetector(stream, callback) {
  let audioContext;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return { stop() {} };
  }

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let speaking = false;
  let rafId = null;

  function check() {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < VOICE_BINS; i++) sum += dataArray[i];
    const avg = sum / VOICE_BINS;
    const now = avg > THRESHOLD;

    if (now !== speaking) {
      speaking = now;
      callback(speaking);
    }

    rafId = requestAnimationFrame(check);
  }

  check();

  return {
    stop() {
      if (rafId != null) cancelAnimationFrame(rafId);
      audioContext.close().catch(() => {});
    },
  };
}
