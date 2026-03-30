import { Cpu } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useSolverConnection } from '../hooks/useSolverConnection'

export function SolverIndicator() {
  const { connected, version, running } = useSolverConnection()

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-default',
        connected
          ? running
            ? 'bg-purple-100 text-purple-700'
            : 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500'
      )}
      title={
        connected
          ? `Owen Solver v${version} — ${running ? 'Ejecutando' : 'Listo'}`
          : 'Solver no detectado (localhost:9377)'
      }
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          connected
            ? running
              ? 'bg-purple-500 animate-pulse'
              : 'bg-green-500'
            : 'bg-gray-400'
        )}
      />
      <Cpu className="w-3 h-3" />
      <span className="hidden sm:inline">
        {connected ? (running ? 'Solver...' : 'Solver') : 'Offline'}
      </span>
    </div>
  )
}
