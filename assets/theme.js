/**
 * Color theme: follow system by default.
 * Manual light/dark override lasts until the next prefers-color-scheme change.
 */
(function () {
  const root = document.documentElement
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  let override = null

  function systemTheme() {
    return mq.matches ? "dark" : "light"
  }

  function appliedTheme() {
    return override || systemTheme()
  }

  function apply() {
    const theme = appliedTheme()
    root.setAttribute("data-theme", theme)
    for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
      const next = theme === "dark" ? "light" : "dark"
      btn.setAttribute("aria-label", "Switch to " + next + " mode")
      btn.setAttribute("title", "Switch to " + next + " mode")
    }
  }

  function toggle() {
    override = appliedTheme() === "dark" ? "light" : "dark"
    apply()
  }

  function onSystemChange() {
    override = null
    apply()
  }

  apply()

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onSystemChange)
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onSystemChange)
  }

  document.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-theme-toggle]")
    if (btn) {
      event.preventDefault()
      toggle()
    }
  })
})()
