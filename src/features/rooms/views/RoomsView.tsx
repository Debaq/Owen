import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { toast } from 'sonner'
import { RoomList } from '../components/RoomList'
import { RoomForm } from '../components/RoomForm'
import type { RoomWithBuilding, RoomFormData } from '../services/roomService'
import {
  createRoom,
  updateRoom,
  deleteRoom,
} from '../services/roomService'

type ModalMode = 'create' | 'edit' | 'view' | null

export function RoomsView() {
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithBuilding | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<RoomWithBuilding | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Handler para crear nueva sala
  const handleCreateNew = () => {
    setSelectedRoom(null)
    setModalMode('create')
  }

  // Handler para ver detalles de sala
  const handleRoomView = (room: RoomWithBuilding) => {
    setSelectedRoom(room)
    setModalMode('view')
  }

  // Handler para editar sala
  const handleRoomEdit = (room: RoomWithBuilding) => {
    setSelectedRoom(room)
    setModalMode('edit')
  }

  // Handler para iniciar eliminación
  const handleRoomDelete = (room: RoomWithBuilding) => {
    setRoomToDelete(room)
    setDeleteDialogOpen(true)
  }

  // Handler para confirmar eliminación
  const confirmDelete = async () => {
    if (!roomToDelete) return

    try {
      await deleteRoom(roomToDelete.id)
      toast.success(`Sala ${roomToDelete.code} desactivada correctamente`)
      setDeleteDialogOpen(false)
      setRoomToDelete(null)
      setRefreshTrigger((prev) => prev + 1) // Trigger re-render
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar sala')
    }
  }

  // Handler para enviar formulario
  const handleFormSubmit = async (data: RoomFormData) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createRoom(data)
        toast.success(`Sala ${data.code} creada correctamente`)
      } else if (modalMode === 'edit' && selectedRoom) {
        await updateRoom(selectedRoom.id, data)
        toast.success(`Sala ${data.code} actualizada correctamente`)
      }
      setModalMode(null)
      setSelectedRoom(null)
      setRefreshTrigger((prev) => prev + 1) // Trigger re-render
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar sala')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cerrar modal
  const handleCloseModal = () => {
    if (!isSubmitting) {
      setModalMode(null)
      setSelectedRoom(null)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestión de Salas</h1>
        <p className="text-muted-foreground mt-1">
          Administra las salas, auditorios, laboratorios y espacios del campus
        </p>
      </div>

      {/* Lista de salas */}
      <RoomList
        key={refreshTrigger} // Force re-mount on refresh
        onRoomView={handleRoomView}
        onRoomEdit={handleRoomEdit}
        onRoomDelete={handleRoomDelete}
        onCreateNew={handleCreateNew}
        showActions={true}
      />

      {/* Modal para crear/editar */}
      <Dialog open={modalMode === 'create' || modalMode === 'edit'} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Crear Nueva Sala' : 'Editar Sala'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'create'
                ? 'Complete los datos de la nueva sala. Los campos marcados con * son obligatorios.'
                : 'Actualice la información de la sala.'}
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            initialData={selectedRoom || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseModal}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para ver detalles (solo lectura) */}
      <Dialog open={modalMode === 'view'} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Sala</DialogTitle>
            <DialogDescription>
              {selectedRoom?.code} - {selectedRoom?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium capitalize">{selectedRoom.tipo.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacidad</p>
                  <p className="font-medium">{selectedRoom.capacidad} personas</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Edificio</p>
                  <p className="font-medium">{selectedRoom.edificio?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Piso</p>
                  <p className="font-medium">{selectedRoom.piso}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coordenadas</p>
                  <p className="font-medium text-xs">
                    {selectedRoom.lat.toFixed(5)}, {selectedRoom.lng.toFixed(5)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium">{selectedRoom.activo ? 'Activa' : 'Inactiva'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Mobiliario</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRoom.mobiliario.map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-secondary rounded-md text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Equipamiento</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRoom.equipamiento.map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-secondary rounded-md text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Reglas de uso</p>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedRoom.reglas}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar sala?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de desactivar la sala <strong>{roomToDelete?.code}</strong>.
              La sala no se eliminará permanentemente, pero dejará de aparecer en las listas activas.
              <br />
              <br />
              Esta acción se puede revertir reactivando la sala posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
