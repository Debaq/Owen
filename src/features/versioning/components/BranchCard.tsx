import { GitBranch, MoreVertical, Trash2, GitMerge, Copy, Eye } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import type { HorarioBranch } from '@/shared/types'

const estadoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  revision: 'bg-yellow-100 text-yellow-700',
  aprobado: 'bg-blue-100 text-blue-700',
  publicado: 'bg-green-100 text-green-700',
  descartado: 'bg-red-100 text-red-700',
}

interface Props {
  branch: HorarioBranch
  onView: (branch: HorarioBranch) => void
  onFork: (branch: HorarioBranch) => void
  onMerge: (branch: HorarioBranch) => void
  onDelete: (branch: HorarioBranch) => void
}

export function BranchCard({ branch, onView, onFork, onMerge, onDelete }: Props) {
  const scoreColor = branch.ultimo_score
    ? branch.ultimo_score >= 85 ? 'text-green-600'
    : branch.ultimo_score >= 70 ? 'text-yellow-600'
    : 'text-red-600'
    : 'text-gray-400'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <GitBranch className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{branch.nombre}</h3>
                {branch.es_principal && <Badge variant="outline" className="text-xs">principal</Badge>}
                <Badge className={`text-xs ${estadoColors[branch.estado] || ''}`}>
                  {branch.estado}
                </Badge>
              </div>
              {branch.descripcion && (
                <p className="text-sm text-muted-foreground mt-1 truncate">{branch.descripcion}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{branch.total_commits || 0} commits</span>
                {branch.ultimo_score !== null && branch.ultimo_score !== undefined && (
                  <span className={`font-medium ${scoreColor}`}>
                    Score: {branch.ultimo_score}
                  </span>
                )}
                <span>{branch.autor_nombre}</span>
                <span>{new Date(branch.created_at).toLocaleDateString('es-CL')}</span>
              </div>
              {branch.ultimo_commit_mensaje && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate">
                  "{branch.ultimo_commit_mensaje}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Button variant="ghost" size="sm" onClick={() => onView(branch)} title="Ver commits">
              <Eye className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(branch)}>
                  <Eye className="w-4 h-4 mr-2" /> Ver commits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFork(branch)}>
                  <Copy className="w-4 h-4 mr-2" /> Fork (crear copia)
                </DropdownMenuItem>
                {!branch.es_principal && (
                  <DropdownMenuItem onClick={() => onMerge(branch)}>
                    <GitMerge className="w-4 h-4 mr-2" /> Merge a principal
                  </DropdownMenuItem>
                )}
                {!branch.es_principal && branch.estado !== 'publicado' && (
                  <DropdownMenuItem onClick={() => onDelete(branch)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
