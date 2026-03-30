import { useMemo } from 'react'
import { countCheckedInPlaysThisWeek, shouldFlagOverage } from '../lib/businessRules.js'

export function useWeeklyLimit(reservations, membershipType) {
  const checkedInCount = useMemo(
    () => countCheckedInPlaysThisWeek(reservations),
    [reservations]
  )
  const isOverLimit = useMemo(
    () => shouldFlagOverage(membershipType, checkedInCount),
    [membershipType, checkedInCount]
  )

  return { checkedInCount, isOverLimit }
}
