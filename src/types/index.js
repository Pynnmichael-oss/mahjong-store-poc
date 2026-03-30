/**
 * Type documentation (JSDoc only — no TypeScript)
 *
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} full_name
 * @property {string} email
 * @property {'customer'|'employee'} role
 * @property {'subscriber'|'walk_in'} membership_type
 * @property {boolean} is_active
 *
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} date
 * @property {string} start_time
 * @property {string} end_time
 * @property {number} total_seats
 * @property {'open'|'active'|'closed'} status
 *
 * @typedef {Object} Seat
 * @property {string} id
 * @property {string} session_id
 * @property {number} seat_number
 * @property {'available'|'reserved'|'occupied'} status
 *
 * @typedef {Object} Reservation
 * @property {string} id
 * @property {string} user_id
 * @property {string} session_id
 * @property {string} seat_id
 * @property {'confirmed'|'checked_in'|'no_show'|'cancelled'|'walk_in'} status
 * @property {string} membership_type_at_booking
 * @property {boolean} is_flagged_overage
 * @property {boolean} is_walk_in
 * @property {string} reserved_at
 * @property {string|null} checked_in_at
 * @property {string|null} override_by
 * @property {string|null} override_at
 * @property {string|null} notes
 */

export {}
