function normalizeKey(code) {
  return code.length === 1 ? code.toLowerCase() : code
}

export function createKeyboard() {
  const down = new Set()
  const justPressed = new Set()

  window.addEventListener("keydown", (event) => {
    const key = normalizeKey(event.code)
    if (!down.has(key)) justPressed.add(key)
    down.add(key)
  })

  window.addEventListener("keyup", (event) => {
    down.delete(normalizeKey(event.code))
  })

  window.addEventListener("blur", () => {
    down.clear()
    justPressed.clear()
  })

  return {
    isDown(...keys) {
      return keys.some((key) => down.has(normalizeKey(key)))
    },
    wasPressed(...keys) {
      return keys.some((key) => justPressed.has(normalizeKey(key)))
    },
    endFrame() {
      justPressed.clear()
    },
  }
}

export function createPointer(target = window) {
  const state = {
    x: 0,
    y: 0,
    isDown: false,
    clicked: false,
    wheel: 0,
  }

  function onMove(event) {
    const point = event.touches ? event.touches[0] : event
    state.x = point.clientX
    state.y = point.clientY
  }

  function onDown(event) {
    onMove(event)
    state.isDown = true
    state.clicked = true
  }

  function onUp() {
    state.isDown = false
  }

  function onWheel(event) {
    state.wheel += event.deltaY
  }

  target.addEventListener("pointermove", onMove)
  target.addEventListener("pointerdown", onDown)
  window.addEventListener("pointerup", onUp)
  target.addEventListener("wheel", onWheel, { passive: true })

  return {
    get x() {
      return state.x
    },
    get y() {
      return state.y
    },
    get isDown() {
      return state.isDown
    },
    get clicked() {
      return state.clicked
    },
    get wheel() {
      return state.wheel
    },
    endFrame() {
      state.clicked = false
      state.wheel = 0
    },
  }
}

export function createInput(target = window) {
  const keyboard = createKeyboard()
  const pointer = createPointer(target)

  function endFrame() {
    keyboard.endFrame()
    pointer.endFrame()
  }

  return { keyboard, pointer, endFrame }
}
