export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => --t * t * t + 1,
  inOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  outBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
  },
  outElastic: (t) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0
      ? 0
      : t === 1
        ? 1
        : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  outBounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
}

export function createTweens() {
  const active = []

  function add({
    from = 0,
    to = 1,
    duration = 1,
    delay = 0,
    ease: easeFn = ease.inOutQuad,
    loop = false,
    yoyo = false,
    onUpdate,
    onComplete,
  }) {
    const tween = {
      from,
      to,
      duration: Math.max(duration, 0.0001),
      delay,
      ease: easeFn,
      loop,
      yoyo,
      onUpdate,
      onComplete,
      time: 0,
      done: false,
    }
    active.push(tween)
    return {
      cancel() {
        tween.done = true
      },
    }
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const tween = active[i]
      if (tween.done) {
        active.splice(i, 1)
        continue
      }
      if (tween.delay > 0) {
        tween.delay -= dt
        continue
      }
      tween.time += dt
      let progress = tween.time / tween.duration
      if (progress >= 1) {
        if (tween.loop) {
          if (tween.yoyo) {
            const swap = tween.from
            tween.from = tween.to
            tween.to = swap
          }
          tween.time -= tween.duration
          progress = 0
        } else {
          progress = 1
          tween.done = true
        }
      }
      const value = tween.from + (tween.to - tween.from) * tween.ease(progress)
      tween.onUpdate?.(value)
      if (tween.done) tween.onComplete?.()
    }
  }

  function cancelAll() {
    active.length = 0
  }

  return { add, update, cancelAll }
}

function attach(engine, updater) {
  const cancel = engine.onFrame((delta, elapsed) => updater(delta, elapsed))
  return () => {
    cancel()
  }
}

export function spin(engine, object, { x = 0, y = 0.6, z = 0 } = {}) {
  return attach(engine, (delta) => {
    object.rotation.x += x * delta
    object.rotation.y += y * delta
    object.rotation.z += z * delta
  })
}

export function bob(engine, object, { amplitude = 0.25, speed = 1.5 } = {}) {
  const baseY = object.position.y
  return attach(engine, (_delta, elapsed) => {
    object.position.y = baseY + Math.sin(elapsed * speed) * amplitude
  })
}

export function orbit(
  engine,
  object,
  { radius = 3, speed = 0.8, center = { x: 0, y: 0, z: 0 } } = {}
) {
  return attach(engine, (_delta, elapsed) => {
    object.position.set(
      center.x + Math.cos(elapsed * speed) * radius,
      center.y,
      center.z + Math.sin(elapsed * speed) * radius
    )
    object.lookAt(center.x, center.y, center.z)
  })
}

export function pulse(engine, object, { amount = 0.1, speed = 2 } = {}) {
  const base = object.scale.clone()
  return attach(engine, (_delta, elapsed) => {
    const factor = 1 + Math.sin(elapsed * speed) * amount
    object.scale.set(base.x * factor, base.y * factor, base.z * factor)
  })
}

export function follow(engine, object, target, { speed = 5 } = {}) {
  return attach(engine, (delta) => {
    object.position.lerp(target.position, Math.min(speed * delta, 1))
  })
}
