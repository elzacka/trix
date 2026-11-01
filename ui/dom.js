// The DOM helpers both windows share.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value)
    else if (key.startsWith('aria-')) el.setAttribute(key, String(value))
    else if (value !== false && value != null) el.setAttribute(key, value === true ? '' : value)
  }
  el.append(...children.flat().filter(c => c != null && c !== false && c !== ''))
  return el
}

/** A built-in Tabler icon from its paths. */
export function svg(paths) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  el.setAttribute('viewBox', '0 0 24 24')
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = paths.map(d => `<path d="${d}"/>`).join('')
  return el
}
