export function getTeamLabel(
  labelsConfiguration: Map<string, string[]>,
  key: string
): string[] {
  const labels: string[] = []
  for (const [label, keys] of labelsConfiguration.entries())
    if (keys.includes(key)) labels.push(label)
  return labels
}
