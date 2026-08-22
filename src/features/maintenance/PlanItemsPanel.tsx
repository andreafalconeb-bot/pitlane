import { AlertTriangle, Bell, BellOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { MaintItemView } from '@/types'

const STATUS_LABEL: Record<MaintItemView['status'], string> = {
  overdue: 'VENCIDO',
  soon: 'PRÓXIMO',
  ok: 'AL DÍA',
}

const STATUS_TONE: Record<MaintItemView['status'], 'danger' | 'warning' | 'success'> = {
  overdue: 'danger',
  soon: 'warning',
  ok: 'success',
}

export function PlanItemsPanel({ items }: { items: MaintItemView[] }) {
  const overdue = items.filter((i) => i.status === 'overdue').length
  const soon = items.filter((i) => i.status === 'soon').length
  const ok = items.length - overdue - soon

  return (
    <>
      <Card accent="accent" className="mb-3">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-danger/15 rounded-md py-1.5">
            <div className="text-base font-extrabold text-danger">{overdue}</div>
            <div className="text-[9px] text-muted">VENCIDOS</div>
          </div>
          <div className="bg-warning/15 rounded-md py-1.5">
            <div className="text-base font-extrabold text-warning">{soon}</div>
            <div className="text-[9px] text-muted">PRÓXIMOS</div>
          </div>
          <div className="bg-success/15 rounded-md py-1.5">
            <div className="text-base font-extrabold text-success">{ok}</div>
            <div className="text-[9px] text-muted">AL DÍA</div>
          </div>
        </div>
      </Card>

      {items.map((item) => (
        <Card
          key={item.id}
          accent={item.status === 'overdue' ? 'danger' : item.status === 'soon' ? 'warning' : 'success'}
          className="mb-2"
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <div className="flex-1">
              <div className="text-xs font-medium flex items-center gap-1">
                {item.criticality === 'alta' && <AlertTriangle size={11} className="text-danger" />}
                {item.label}
              </div>
              <div className="text-[10px] text-muted mt-0.5">
                {item.km_interval && item.month_interval
                  ? `${item.km_interval.toLocaleString()} km ó ${item.month_interval}m`
                  : item.km_interval
                    ? `Cada ${item.km_interval.toLocaleString()} km`
                    : `Cada ${item.month_interval} meses`}
              </div>
            </div>
            <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          </div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${
                item.status === 'overdue' ? 'bg-danger' : item.status === 'soon' ? 'bg-warning' : 'bg-success'
              }`}
              style={{ width: `${item.pct}%` }}
            />
          </div>
          {!item.alarm_on && (
            <div className="flex items-center gap-1 text-[10px] text-muted mt-1.5">
              <BellOff size={11} /> Recordatorio desactivado
            </div>
          )}
          {item.alarm_on && item.status !== 'ok' && (
            <div className="flex items-center gap-1 text-[10px] text-muted mt-1.5">
              <Bell size={11} /> Recordatorio activo
            </div>
          )}
        </Card>
      ))}
    </>
  )
}
