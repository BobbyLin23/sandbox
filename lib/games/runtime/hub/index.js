const STYLES = `
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  font-family: system-ui, sans-serif;
  color: #fff;
`

function el(tag, styles, parent) {
  const node = document.createElement(tag)
  node.style.cssText = styles
  if (parent) parent.appendChild(node)
  return node
}

export function createHub({ parent = document.body } = {}) {
  const root = el("div", STYLES, parent)

  const scoreBox = el(
    "div",
    "position:absolute;top:16px;left:16px;font-size:28px;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.4);display:none;",
    root
  )

  const messageBox = el(
    "div",
    "position:absolute;top:16px;left:50%;transform:translateX(-50%);font-size:20px;font-weight:600;background:rgba(0,0,0,.45);padding:8px 18px;border-radius:999px;opacity:0;transition:opacity .25s;",
    root
  )

  const banner = el(
    "div",
    "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.55);text-align:center;padding:24px;",
    root
  )
  const bannerTitle = el(
    "div",
    "font-size:56px;font-weight:800;text-shadow:0 4px 24px rgba(0,0,0,.5);",
    banner
  )
  const bannerSubtitle = el("div", "font-size:20px;opacity:.85;max-width:32rem;", banner)
  const bannerButton = el(
    "button",
    "pointer-events:auto;margin-top:12px;font-size:18px;font-weight:700;padding:12px 36px;border:none;border-radius:999px;background:#EA580C;color:#fff;cursor:pointer;",
    banner
  )

  let messageTimer = 0

  function setScore(value) {
    scoreBox.textContent = String(value)
    scoreBox.style.display = "block"
  }

  function addScore(delta) {
    setScore(Number(scoreBox.textContent || 0) + delta)
  }

  function hideScore() {
    scoreBox.style.display = "none"
  }

  function message(text, duration = 2.5) {
    messageBox.textContent = text
    messageBox.style.opacity = "1"
    clearTimeout(messageTimer)
    if (duration > 0) {
      messageTimer = setTimeout(() => {
        messageBox.style.opacity = "0"
      }, duration * 1000)
    }
  }

  function showBanner({ title, subtitle = "", button = "Play again", onClick } = {}) {
    bannerTitle.textContent = title
    bannerSubtitle.textContent = subtitle
    bannerButton.style.display = button ? "block" : "none"
    bannerButton.textContent = button || ""
    bannerButton.onclick = () => {
      hideBanner()
      onClick?.()
    }
    banner.style.display = "flex"
  }

  function hideBanner() {
    banner.style.display = "none"
  }

  function dispose() {
    clearTimeout(messageTimer)
    root.remove()
  }

  return {
    root,
    setScore,
    addScore,
    hideScore,
    message,
    showBanner,
    hideBanner,
    dispose,
  }
}
