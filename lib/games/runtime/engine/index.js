import * as THREE from "three"

export function createEngine({
  container = document.body,
  background = 0x0f0f12,
  fov = 60,
  near = 0.1,
  far = 2000,
  shadows = false,
  camera: cameraOptions = {},
} = {}) {
  const width = container.clientWidth || window.innerWidth
  const height = container.clientHeight || window.innerHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  if (shadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  renderer.domElement.style.display = "block"
  renderer.domElement.style.touchAction = "none"
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  if (background !== null) {
    scene.background = new THREE.Color(background)
  }

  const camera = new THREE.PerspectiveCamera(fov, width / height, near, far)
  camera.position.set(
    cameraOptions.x ?? 0,
    cameraOptions.y ?? 2.5,
    cameraOptions.z ?? 7
  )
  camera.lookAt(cameraOptions.lookAtX ?? 0, cameraOptions.lookAtY ?? 0, 0)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(6, 10, 5)
  if (shadows) {
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
  }
  scene.add(ambient, sun)

  const frameHooks = new Set()
  const clock = new THREE.Clock()
  let running = false
  let rafId = 0

  function resize() {
    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  window.addEventListener("resize", resize)

  function tick() {
    rafId = requestAnimationFrame(tick)
    const delta = Math.min(clock.getDelta(), 0.1)
    const elapsed = clock.elapsedTime
    for (const hook of frameHooks) hook(delta, elapsed)
    renderer.render(scene, camera)
  }

  function start() {
    if (running) return
    running = true
    clock.start()
    tick()
  }

  function stop() {
    running = false
    cancelAnimationFrame(rafId)
  }

  function onFrame(hook) {
    frameHooks.add(hook)
    return () => frameHooks.delete(hook)
  }

  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()

  function pick(clientX, clientY, objects) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    raycaster.setFromCamera(pointerNdc, camera)
    const targets = Array.isArray(objects) ? objects : scene.children
    return raycaster.intersectObjects(targets, true)
  }

  function dispose() {
    stop()
    window.removeEventListener("resize", resize)
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material?.dispose()
        }
      }
    })
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { renderer, scene, camera, ambient, sun, start, stop, onFrame, pick, dispose }
}
