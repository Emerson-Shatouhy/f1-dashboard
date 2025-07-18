import { useState, useEffect } from 'react'
import { useExtrapolatedClockStore } from '@renderer/stores/extrapolatedClockStore'

export function useCountdownTimer(): string {
  const extrapolatedClock = useExtrapolatedClockStore((state) => state.extrapolatedClock)
  const [displayTime, setDisplayTime] = useState('00:00:00')

  useEffect(() => {
    if (!extrapolatedClock) {
      setDisplayTime('00:00:00')
      return
    }

    // Parse the initial remaining time
    const parseTimeString = (timeStr: string): number => {
      const parts = timeStr.split(':')
      const hours = parseInt(parts[0] || '0', 10)
      const minutes = parseInt(parts[1] || '0', 10)
      const seconds = parseInt(parts[2] || '0', 10)
      return hours * 3600 + minutes * 60 + seconds
    }

    const formatTime = (totalSeconds: number): string => {
      if (totalSeconds <= 0) return '00:00:00'

      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    const initialRemainingSeconds = parseTimeString(extrapolatedClock.Remaining)
    const startTime = Date.now()

    const updateTimer = (): void => {
      if (!extrapolatedClock.Extrapolating) {
        // When not extrapolating, just show the static remaining time
        setDisplayTime(extrapolatedClock.Remaining)
        return
      }

      // When extrapolating, count down from the initial time
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
      const currentRemainingSeconds = Math.max(0, initialRemainingSeconds - elapsedSeconds)
      setDisplayTime(formatTime(currentRemainingSeconds))
    }

    // Update immediately
    updateTimer()

    // Set up interval only if extrapolating
    let intervalId: NodeJS.Timeout | null = null
    if (extrapolatedClock.Extrapolating) {
      intervalId = setInterval(updateTimer, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [extrapolatedClock])

  return displayTime
}
