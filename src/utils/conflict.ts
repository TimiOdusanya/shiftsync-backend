export function shiftsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

export function minimumRestViolation(
  endOfPrevious: Date,
  startOfNext: Date,
  minimumHours: number
): boolean {
  const restHours = (startOfNext.getTime() - endOfPrevious.getTime()) / (1000 * 60 * 60);
  return restHours < minimumHours;
}
