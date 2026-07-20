/** True once the event's end date is past. endDate is a "YYYY-MM-DD" string, so
 *  a lexical compare against today's date is correct. */
export function hasEnded(endDate: string | null): boolean {
  return !!endDate && endDate < new Date().toISOString().slice(0, 10);
}
