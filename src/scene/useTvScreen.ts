import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { insertedDisc, type CdInfo } from './cdRegistry'
import { preloadMessyDeskScene, messyDeskSceneLoadProgress } from '../sceneLoader'

const W = 320
const H = 240

// Press Start 2P is built on an 8 px grid – multiples of it stay pixel-perfect
const FONT_FAMILY = 'Press Start 2P'
const FONT_URL    = '/PressStart2P.ttf'
const FONT_SIZE   = 16
const FONT        = `${FONT_SIZE}px "${FONT_FAMILY}", monospace`
const LINE_GAP    = 16

const TEXT_COLOR = '#FFFFFF'
const BG_COLOR   = '#000000'
const BLINK_INTERVAL = 0.53   // s, same as the cursor on the login screen

const BAR_SEGMENTS = 16
const SEG_W        = 10
const SEG_H        = 12
const SEG_GAP      = 4
const BAR_PADDING  = 4
const BAR_BORDER   = 2
const BAR_W        = BAR_SEGMENTS * SEG_W + (BAR_SEGMENTS - 1) * SEG_GAP + 2 * (BAR_PADDING + BAR_BORDER)
const BAR_H        = SEG_H + 2 * (BAR_PADDING + BAR_BORDER)
const BAR_MARGIN   = 24
const LOAD_DURATION = 3       // s, minimum – the bar only fills up once the main scene has loaded

type Span = { text: string; color: string }

type Screen =
  | { kind: 'noDisc'; blinkOn: boolean }
  | { kind: 'loading'; disc: CdInfo; filled: number; blinkOn: boolean }

// "Press F to play" is shown – the tutorial scene's F key reads the same state
export const tvScreenState = { readyToPlay: false }

let fontRequested = false
let fontLoaded    = false

// Load once – otherwise the canvas draws with the fallback font before the file has arrived
function loadFont() {
  if (fontRequested) return
  fontRequested = true
  new FontFace(FONT_FAMILY, `url(${FONT_URL})`).load()
    .then((face) => { document.fonts.add(face) })
    .catch(() => {})   // fallback: monospace
    .finally(() => { fontLoaded = true })
}

// Centered line, each span in its own color. Baseline on whole pixels so the pixel font stays sharp
function drawLine(ctx: CanvasRenderingContext2D, spans: Span[], top: number) {
  const full = spans.map((s) => s.text).join('')
  let x = Math.round((W - ctx.measureText(full).width) / 2)
  for (const span of spans) {
    ctx.fillStyle = span.color
    ctx.fillText(span.text, x, top + FONT_SIZE)
    x += ctx.measureText(span.text).width
  }
}

// White frame with clipped corners, filled with individual blocks in the disc color
function drawLoadingBar(ctx: CanvasRenderingContext2D, top: number, filled: number, color: string) {
  const left = Math.round((W - BAR_W) / 2)
  ctx.fillStyle = TEXT_COLOR
  ctx.fillRect(left, top, BAR_W, BAR_H)
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(left + BAR_BORDER, top + BAR_BORDER, BAR_W - 2 * BAR_BORDER, BAR_H - 2 * BAR_BORDER)
  for (const [x, y] of [[0, 0], [BAR_W - BAR_BORDER, 0], [0, BAR_H - BAR_BORDER], [BAR_W - BAR_BORDER, BAR_H - BAR_BORDER]]) {
    ctx.fillRect(left + x, top + y, BAR_BORDER, BAR_BORDER)
  }

  ctx.fillStyle = color
  const inset = BAR_BORDER + BAR_PADDING
  for (let i = 0; i < filled; i++) {
    ctx.fillRect(left + inset + i * (SEG_W + SEG_GAP), top + inset, SEG_W, SEG_H)
  }
}

// null = font not loaded yet → black only
function drawScreen(ctx: CanvasRenderingContext2D, screen: Screen | null) {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, W, H)
  if (!screen) return

  ctx.font = FONT
  ctx.textBaseline = 'alphabetic'
  const white = (text: string): Span[] => [{ text, color: TEXT_COLOR }]

  if (screen.kind === 'noDisc') {
    const top = (H - (2 * FONT_SIZE + LINE_GAP)) / 2
    drawLine(ctx, white('NO DISC FOUND'), top)
    if (screen.blinkOn) drawLine(ctx, white('INSERT DISC'), top + FONT_SIZE + LINE_GAP)
    return
  }

  // Space for "Press F to play" is reserved from the start so the block doesn't jump
  const blockHeight = 3 * FONT_SIZE + LINE_GAP + 2 * BAR_MARGIN + BAR_H
  let top = (H - blockHeight) / 2
  drawLine(ctx, [{ text: screen.disc.name, color: screen.disc.screenColor }, { text: ' DISC FOUND', color: TEXT_COLOR }], top)
  top += FONT_SIZE + LINE_GAP
  drawLine(ctx, white('LOADING SCENE'), top)
  top += FONT_SIZE + BAR_MARGIN
  drawLoadingBar(ctx, top, screen.filled, screen.disc.screenColor)
  top += BAR_H + BAR_MARGIN
  if (screen.blinkOn) drawLine(ctx, white('PRESS F TO PLAY'), top)
}

function createScreenCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Nearest instead of linear – keeps the font's pixels crisp
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace      = THREE.SRGBColorSpace
  texture.magFilter       = THREE.NearestFilter
  texture.minFilter       = THREE.NearestFilter
  texture.generateMipmaps = false

  let lastKey = ''
  return {
    texture,
    // Only redraw and upload when something visibly changes
    render(screen: Screen | null) {
      const key = JSON.stringify(screen)
      if (key === lastKey) return
      lastKey = key
      drawScreen(ctx, screen)
      texture.needsUpdate = true
    },
  }
}

// TV image depending on the inserted CD: "No disc" → loading bar → "Press F to play"
export function useTvScreen() {
  const screenCanvas = useMemo(() => createScreenCanvas(), [])
  const seenDisc  = useRef<CdInfo | null>(null)
  const loadStart = useRef(0)

  useEffect(() => { loadFont() }, [])
  useEffect(() => () => screenCanvas.texture.dispose(), [screenCanvas])
  // tvScreenState is global – don't leave it "ready" on scene change
  useEffect(() => () => { tvScreenState.readyToPlay = false }, [])

  useFrame(({ clock }) => {
    const t    = clock.elapsedTime
    const disc = insertedDisc.current
    if (disc !== seenDisc.current) {
      seenDisc.current  = disc
      loadStart.current = t
      // Errors go to the console – the bar then stalls and F stays locked
      if (disc) preloadMessyDeskScene().catch(console.error)
    }

    // The bar follows the slower of minimum duration and actual load progress
    const timedSegments  = Math.floor(((t - loadStart.current) / LOAD_DURATION) * BAR_SEGMENTS)
    const loadedSegments = Math.floor(messyDeskSceneLoadProgress() * BAR_SEGMENTS)
    const filled = disc ? Math.min(BAR_SEGMENTS, timedSegments, loadedSegments) : 0
    const ready  = fontLoaded && disc !== null && filled === BAR_SEGMENTS
    tvScreenState.readyToPlay = ready

    const blinkOn = Math.floor(t / BLINK_INTERVAL) % 2 === 0
    let screen: Screen | null = null
    if (fontLoaded) {
      screen = disc
        ? { kind: 'loading', disc, filled, blinkOn: ready && blinkOn }
        : { kind: 'noDisc', blinkOn }
    }
    screenCanvas.render(screen)
  })

  return screenCanvas.texture
}
