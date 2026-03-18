export const MOVE_SPEED = 4

// ─── Keyboard 3D layout constants ────────────────────────────────────────────
export const KB_UNIT_W  = 0.026
export const KB_UNIT_D  = 0.022
export const KB_GAP     = 0.003
export const KB_BASE_W  = 0.44
export const KB_BASE_D  = 0.15
export const KB_BASE_H  = 0.025
export const KB_KEY_H   = 0.007
export const KB_Y_REST    = KB_BASE_H / 2 + KB_KEY_H / 2
export const KB_Y_PRESSED = KB_Y_REST - 0.003

export const KB_ROWS: { code: string; w?: number }[][] = [
  [
    { code: 'Backquote' }, { code: 'Digit1' }, { code: 'Digit2' },
    { code: 'Digit3' },    { code: 'Digit4' }, { code: 'Digit5' },
    { code: 'Digit6' },    { code: 'Digit7' }, { code: 'Digit8' },
    { code: 'Digit9' },    { code: 'Digit0' }, { code: 'Minus'  },
    { code: 'Equal'  },    { code: 'Backspace', w: 2 },
  ],
  [
    { code: 'Tab',          w: 1.5 },
    { code: 'KeyQ' }, { code: 'KeyW' }, { code: 'KeyE' }, { code: 'KeyR' },
    { code: 'KeyT' }, { code: 'KeyY' }, { code: 'KeyU' }, { code: 'KeyI' },
    { code: 'KeyO' }, { code: 'KeyP' },
    { code: 'BracketLeft' }, { code: 'BracketRight' },
    { code: 'Backslash', w: 1.5 },
  ],
  [
    { code: 'CapsLock',  w: 1.75 },
    { code: 'KeyA' }, { code: 'KeyS' }, { code: 'KeyD' }, { code: 'KeyF' },
    { code: 'KeyG' }, { code: 'KeyH' }, { code: 'KeyJ' }, { code: 'KeyK' },
    { code: 'KeyL' }, { code: 'Semicolon' }, { code: 'Quote' },
    { code: 'Enter', w: 2.25 },
  ],
  [
    { code: 'ShiftLeft', w: 2.25 },
    { code: 'KeyZ' }, { code: 'KeyX' }, { code: 'KeyC' }, { code: 'KeyV' },
    { code: 'KeyB' }, { code: 'KeyN' }, { code: 'KeyM' },
    { code: 'Comma' }, { code: 'Period' }, { code: 'Slash' },
    { code: 'ShiftRight', w: 2.75 },
  ],
  [
    { code: 'ControlLeft',  w: 1.25 }, { code: 'MetaLeft',    w: 1.25 },
    { code: 'AltLeft',      w: 1.25 }, { code: 'Space',       w: 6.25 },
    { code: 'AltRight',     w: 1.25 }, { code: 'MetaRight',   w: 1.25 },
    { code: 'ContextMenu',  w: 1.25 }, { code: 'ControlRight', w: 1.25 },
  ],
]

export type KbKeyInfo = { code: string; x: number; z: number; keyW: number }

export function buildKbLayout(): KbKeyInfo[] {
  const totalW  = 15 * KB_UNIT_W + 14 * KB_GAP
  const totalD  = 5  * KB_UNIT_D +  4 * KB_GAP
  const startX  = -(KB_BASE_W / 2) + (KB_BASE_W - totalW) / 2
  const startZ  = -(KB_BASE_D / 2) + (KB_BASE_D - totalD) / 2
  const keys: KbKeyInfo[] = []
  KB_ROWS.forEach((row, ri) => {
    const z = startZ + ri * (KB_UNIT_D + KB_GAP) + KB_UNIT_D / 2
    let xCursor = startX
    row.forEach(key => {
      const w    = key.w ?? 1
      const keyW = w * KB_UNIT_W + (w - 1) * KB_GAP
      keys.push({ code: key.code, x: xCursor + keyW / 2, z, keyW })
      xCursor += keyW + KB_GAP
    })
  })
  return keys
}

export const KB_LAYOUT = buildKbLayout()
