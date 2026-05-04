import { useMemo } from 'react'
import { countPlaysForSessionWeek, shouldFlagOverage } from '../lib/businessRules.js'

export function useWeeklyLimit(reservations, membershipType, sessionDate = null) {
  const checkedInCount = useMemo(
    () => countPlaysForSessionWeek(reservations, sessionDate),
    [reservations, sessionDate]
  )
  const isOverLimit = useMemo(
    () => shouldFlagOverage(membershipType, checkedInCount),
    [membershipType, checkedInCount]
  )
  return { checkedInCount, isOverLimit }
}
