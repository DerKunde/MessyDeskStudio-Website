export function useInputMode(): 'touch' | 'mouse' {
  return window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse'
}