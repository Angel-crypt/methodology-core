/**
 * Parsea un User-Agent string y extrae browser y OS legibles.
 * Sin dependencias externas — solo regex sobre las cadenas más comunes.
 */

const BROWSER_PATTERNS = [
  { re: /Edg\/(\d+)/,             name: 'Edge'    },
  { re: /OPR\/(\d+)/,             name: 'Opera'   },
  { re: /Chrome\/(\d+)/,          name: 'Chrome'  },
  { re: /Firefox\/(\d+)/,         name: 'Firefox' },
  { re: /Safari\/(\d+).*Version\/(\d+)/, name: 'Safari'  },
  { re: /MSIE (\d+)/,             name: 'IE'      },
  { re: /Trident.*rv:(\d+)/,      name: 'IE'      },
]

const OS_PATTERNS = [
  { re: /Windows NT 10\.0/,  name: 'Windows 10/11' },
  { re: /Windows NT 6\.3/,   name: 'Windows 8.1'  },
  { re: /Windows NT 6\.1/,   name: 'Windows 7'    },
  { re: /Windows/,           name: 'Windows'      },
  { re: /iPhone/,            name: 'iOS (iPhone)' },
  { re: /iPad/,              name: 'iOS (iPad)'   },
  { re: /Android/,           name: 'Android'      },
  { re: /Mac OS X/,          name: 'macOS'        },
  { re: /Linux/,             name: 'Linux'        },
]

/**
 * @param {string|null} ua  — User-Agent string
 * @returns {{ browser: string, os: string }}
 */
export function parseUserAgent(ua) {
  if (!ua) return { browser: 'Desconocido', os: 'Desconocido' }

  let browser = 'Desconocido'
  for (const p of BROWSER_PATTERNS) {
    const m = ua.match(p.re)
    if (m) {
      const version = m[2] || m[1]
      browser = version ? `${p.name} ${version}` : p.name
      break
    }
  }

  let os = 'Desconocido'
  for (const p of OS_PATTERNS) {
    if (p.re.test(ua)) {
      os = p.name
      break
    }
  }

  return { browser, os }
}
