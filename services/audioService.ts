
export const playTextToSpeech = (text: string, rate: number = 0.8) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Text-to-speech not supported");
    return;
  }

  const synth = window.speechSynthesis;
  
  // Robust cancellation
  if (synth.speaking) {
    synth.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.volume = 1.0;

  // Helper to select the best English voice
  const getBestVoice = (voices: SpeechSynthesisVoice[]) => {
    return voices.find(v => v.name.includes('Google US English')) // Android/Chrome best
        || voices.find(v => v.name === 'Samantha') // iOS best
        || voices.find(v => v.lang === 'en-US')
        || voices.find(v => v.lang.startsWith('en'));
  };

  // Attempt to load voices
  let voices = synth.getVoices();
  
  if (voices.length > 0) {
    const voice = getBestVoice(voices);
    if (voice) utterance.voice = voice;
  } else {
    // If voices aren't loaded yet (common on mobile), wait for them
    // Note: We still call speak() immediately below as a fallback, 
    // but the onvoiceschanged might update global preferences for next time
    // or we can try to defer speaking. 
    // However, deferring often violates "user gesture" policies on mobile.
    // So we try to get it, if not, we rely on the browser's default engine handling the 'lang' prop.
    synth.onvoiceschanged = () => {
      const updatedVoices = synth.getVoices();
      const voice = getBestVoice(updatedVoices);
      if (voice) {
        // If the utterance hasn't started or finished, we can't easily swap the voice 
        // without re-triggering speak, which is risky.
        // We just log here for debugging.
        console.log("Voices loaded asynchronously");
      }
    };
  }

  // Garbage Collection Fix: Keep reference to utterance
  // This fixes issues where long text stops playing or audio never starts on some Android WebViews
  (window as any)._speechUtteranceRef = utterance;
  utterance.onend = () => {
    (window as any)._speechUtteranceRef = null;
  };
  utterance.onerror = (e) => {
    console.error("Speech error:", e);
    (window as any)._speechUtteranceRef = null;
  };

  // Small timeout to ensure the cancel() above has processed on iOS
  setTimeout(() => {
    synth.speak(utterance);
  }, 10);
};
