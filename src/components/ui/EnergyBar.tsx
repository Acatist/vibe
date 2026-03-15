import { useEnergy } from '@hooks/useEnergy'

/**
 * EnergyBar — Visual indicator of current energy level.
 */
export function EnergyBar() {
  const { energy, energyPercent, isInfinite } = useEnergy()

  const barColor = isInfinite
    ? 'bg-primary'
    : energyPercent > 60
      ? 'bg-primary'
      : energyPercent > 25
        ? 'bg-yellow-500'
        : 'bg-destructive'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Energy</span>
        <span className="font-mono">{isInfinite ? '∞' : `${energy.current}/${energy.max}`}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: isInfinite ? '100%' : `${energyPercent}%` }}
        />
      </div>
    </div>
  )
}
