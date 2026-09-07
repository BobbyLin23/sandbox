export function createSound() {
  let ctx = null
  let master = null
  let muted = false

  function ensure() {
    if (!ctx) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext
      ctx = new AudioContextClass()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    }
    if (ctx.state === "suspended") ctx.resume()
    return ctx
  }

  function tone({
    freq = 440,
    duration = 0.2,
    type = "sine",
    volume = 0.3,
    when = 0,
    sweepTo = null,
  } = {}) {
    if (muted) return
    const audio = ensure()
    const start = audio.currentTime + when
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(freq, start)
    if (sweepTo !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(sweepTo, 1),
        start + duration
      )
    }
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.05)
  }

  function noise({ duration = 0.4, volume = 0.3, filterFreq = 1000 } = {}) {
    if (muted) return
    const audio = ensure()
    const start = audio.currentTime
    const frames = Math.floor(audio.sampleRate * duration)
    const buffer = audio.createBuffer(1, frames, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
    }
    const source = audio.createBufferSource()
    source.buffer = buffer
    const filter = audio.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = filterFreq
    const gain = audio.createGain()
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(start)
  }

  function beep(freq = 660, duration = 0.12) {
    tone({ freq, duration, type: "square", volume: 0.15 })
  }

  function chord(freqs = [261.63, 329.63, 392], duration = 0.5) {
    freqs.forEach((freq, i) =>
      tone({ freq, duration, type: "triangle", volume: 0.12, when: i * 0.02 })
    )
  }

  function melody(notes = [], noteDuration = 0.2) {
    notes.forEach((note, i) => {
      if (note === null) return
      const freq = typeof note === "number" ? note : note.freq
      const type = typeof note === "object" && note.type ? note.type : "square"
      tone({
        freq,
        duration: noteDuration * 0.9,
        type,
        volume: 0.15,
        when: i * noteDuration,
      })
    })
  }

  function collect({ base = 440, steps = 5, duration = 0.07 } = {}) {
    const interval = 2 ** (1 / 12)
    for (let i = 0; i < steps; i++) {
      tone({ freq: base * interval ** (i * 2), duration, type: "triangle", volume: 0.15, when: i * duration })
    }
  }

  function explode() {
    noise({ duration: 0.5, volume: 0.4, filterFreq: 800 })
  }

  function setVolume(value) {
    ensure()
    master.gain.value = Math.max(0, Math.min(1, value))
  }

  function toggleMute() {
    muted = !muted
    return muted
  }

  return { tone, noise, beep, chord, melody, collect, explode, setVolume, toggleMute }
}
