import * as THREE from "three"

export const palette = {
  primary: 0xea580c,
  primaryDark: 0x9a3412,
  primaryLight: 0xfb923c,
  white: 0xffffff,
  cream: 0xfff7ed,
  ink: 0x1c1917,
}

export function createBox({ size = 1, color = palette.primary, ...options } = {}) {
  const s = size
  const geometry = new THREE.BoxGeometry(
    options.width ?? s,
    options.height ?? s,
    options.depth ?? s
  )
  return createMesh(geometry, color, options)
}

export function createSphere({ radius = 0.5, color = palette.primary, ...options } = {}) {
  return createMesh(
    new THREE.SphereGeometry(radius, options.segments ?? 32, options.segments ?? 32),
    color,
    options
  )
}

export function createCylinder({
  radiusTop = 0.5,
  radiusBottom = 0.5,
  height = 1,
  color = palette.primary,
  ...options
} = {}) {
  return createMesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments ?? 32),
    color,
    options
  )
}

export function createCone({ radius = 0.5, height = 1, color = palette.primary, ...options } = {}) {
  return createMesh(
    new THREE.ConeGeometry(radius, height, options.segments ?? 32),
    color,
    options
  )
}

export function createTorus({
  radius = 0.6,
  tube = 0.2,
  color = palette.primary,
  ...options
} = {}) {
  return createMesh(
    new THREE.TorusGeometry(radius, tube, options.segments ?? 16, options.segments ?? 48),
    color,
    options
  )
}

export function createGround({ size = 40, color = palette.ink } = {}) {
  const geometry = new THREE.PlaneGeometry(size, size)
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  return mesh
}

export function createGrid({ size = 40, divisions = 40, color = palette.primaryLight } = {}) {
  return new THREE.GridHelper(size, divisions, color, color)
}

export function createStarfield({ count = 400, radius = 60, size = 0.35, color = palette.white } = {}) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * radius * 2
    positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 2
    positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color, size, sizeAttenuation: true })
  return new THREE.Points(geometry, material)
}

export function createLabel(text, { color = "#ffffff", fontSize = 48, scale = 2 } = {}) {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  const font = `600 ${fontSize}px system-ui, sans-serif`
  context.font = font
  const width = Math.ceil(context.measureText(text).width) + fontSize
  canvas.width = width
  canvas.height = fontSize * 1.5
  const redraw = canvas.getContext("2d")
  redraw.font = font
  redraw.textAlign = "center"
  redraw.textBaseline = "middle"
  redraw.fillStyle = color
  redraw.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  const aspect = canvas.width / canvas.height
  sprite.scale.set(scale * aspect, scale, 1)
  return sprite
}

function createMesh(geometry, color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.45,
    metalness: options.metalness ?? 0.1,
    transparent: options.opacity !== undefined,
    opacity: options.opacity ?? 1,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = options.castShadow ?? true
  mesh.receiveShadow = options.receiveShadow ?? false
  if (options.position) mesh.position.set(...options.position)
  if (options.rotation) mesh.rotation.set(...options.rotation)
  return mesh
}
