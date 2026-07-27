import { useRef } from 'react'

/**
 * Saisie de code OTP par cases individuelles, avec navigation clavier et collage.
 * value / onChange manipulent une simple string de chiffres (ex: "482913").
 */
function OtpInput({ length = 6, value, onChange, autoFocus = true, error = false }) {
  const inputsRef = useRef([])
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  const setDigit = (index, digit) => {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join('').replace(/[^0-9]/g, ''))
  }

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setDigit(index, '')
      return
    }
    // Gère la saisie multi-caractères (ex: clavier virtuel) en distribuant sur les cases suivantes
    const chars = raw.split('')
    const next = digits.slice()
    let cursor = index
    for (const ch of chars) {
      if (cursor >= length) break
      next[cursor] = ch
      cursor += 1
    }
    onChange(next.join('').slice(0, length))
    const focusIndex = Math.min(cursor, length - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus()
        setDigit(index - 1, '')
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted.padEnd(0, '').slice(0, length))
    const focusIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          autoFocus={autoFocus && index === 0}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`w-full aspect-square rounded-xl border-2 bg-[#f8f5ff] text-center
                      text-xl sm:text-2xl font-bold text-[#0b1c30] font-mono
                      focus:bg-white focus:ring-4 focus:outline-none transition-all
                      ${error
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10'
                        : 'border-[#ded6f3] focus:border-[#8127cf] focus:ring-[#8127cf]/10'}`}
        />
      ))}
    </div>
  )
}

export default OtpInput
