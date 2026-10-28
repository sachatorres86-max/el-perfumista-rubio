import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Tags, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import type { Family, Note } from '../../lib/types'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/Modal'
import { ConfirmModal } from '../../components/ConfirmModal'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
} from '../../components/ui'
import { cn } from '../../lib/cn'

type Tab = 'familias' | 'notas'

export function Categories() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('familias')

  const [familyModal, setFamilyModal] = useState(false)
  const [familyForm, setFamilyForm] = useState<{
    id?: number
    name: string
    description: string
    sort_order: string
  }>({ name: '', description: '', sort_order: '0' })

  const [noteModal, setNoteModal] = useState(false)
  const [noteForm, setNoteForm] = useState<{ id?: number; name: string }>({ name: '' })

  const [deleteTargetFamily, setDeleteTargetFamily] = useState<Family | null>(null)
  const [deleteTargetNote, setDeleteTargetNote] = useState<Note | null>(null)

  const { data: families = [], isLoading: familiesLoading } = useQuery({
    queryKey: ['admin-families'],
    queryFn: api.admin.families,
  })

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['admin-notes'],
    queryFn: api.admin.notes,
  })

  const saveFamily = useMutation({
    mutationFn: () => {
      const data = {
        name: familyForm.name.trim(),
        description: familyForm.description.trim() || null,
        sort_order: Number(familyForm.sort_order) || 0,
      }
      return familyForm.id
        ? api.admin.updateFamily(familyForm.id, data)
        : api.admin.createFamily(data)
    },
    onSuccess: () => {
      toast(familyForm.id ? 'Familia actualizada' : 'Familia creada')
      queryClient.invalidateQueries({ queryKey: ['admin-families'] })
      queryClient.invalidateQueries({ queryKey: ['families'] })
      setFamilyModal(false)
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const deleteFamily = useMutation({
    mutationFn: (id: number) => api.admin.deleteFamily(id),
    onSuccess: () => {
      toast('Familia eliminada')
      setDeleteTargetFamily(null)
      queryClient.invalidateQueries({ queryKey: ['admin-families'] })
      queryClient.invalidateQueries({ queryKey: ['families'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const saveNote = useMutation({
    mutationFn: () => {
      const data = { name: noteForm.name.trim() }
      return noteForm.id ? api.admin.updateNote(noteForm.id, data) : api.admin.createNote(data)
    },
    onSuccess: () => {
      toast(noteForm.id ? 'Nota actualizada' : 'Nota creada')
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setNoteModal(false)
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const deleteNote = useMutation({
    mutationFn: (id: number) => api.admin.deleteNote(id),
    onSuccess: () => {
      toast('Nota eliminada')
      setDeleteTargetNote(null)
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const openFamily = (family?: Family) => {
    setFamilyForm(
      family
        ? {
            id: family.id,
            name: family.name,
            description: family.description ?? '',
            sort_order: '0',
          }
        : { name: '', description: '', sort_order: '0' },
    )
    setFamilyModal(true)
  }

  const openNote = (note?: Note) => {
    setNoteForm(note ? { id: note.id, name: note.name } : { name: '' })
    setNoteModal(true)
  }

  const loading = tab === 'familias' ? familiesLoading : notesLoading

  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Administra las familias olfativas y las notas que usan los productos."
        actions={
          <Button onClick={() => (tab === 'familias' ? openFamily() : openNote())}>
            <Plus className="h-4 w-4" />
            {tab === 'familias' ? 'Nueva familia' : 'Nueva nota'}
          </Button>
        }
      />

      <div className="mb-5 inline-flex rounded-full border border-sand-200 bg-white p-1">
        {(
          [
            { value: 'familias', label: 'Familias olfativas', count: families.length },
            { value: 'notas', label: 'Notas olfativas', count: notes.length },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              tab === item.value ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            <span className="ml-1.5 text-[11px] opacity-60">{item.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : tab === 'familias' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((family) => (
            <Card key={family.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl text-ink">{family.name}</h3>
                  <p className="text-[11px] text-ink-muted">/{family.slug}</p>
                </div>
                <Badge tone="brand">
                  {family.product_count}{' '}
                  {family.product_count === 1 ? 'producto' : 'productos'}
                </Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-ink-muted">
                {family.description || 'Sin descripción.'}
              </p>
              <div className="mt-4 flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => openFamily(family)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTargetFamily(family)}
                  aria-label={`Eliminar ${family.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-sand-50 py-1.5 pl-3 pr-1.5"
              >
                <span className="text-sm font-medium text-ink">{note.name}</span>
                <span className="text-[10px] text-ink-muted">{note.usage_count ?? 0}</span>
                <button
                  type="button"
                  onClick={() => openNote(note)}
                  className="rounded-full p-1 text-ink-muted transition hover:bg-white hover:text-brand-700"
                  aria-label={`Editar ${note.name}`}
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetNote(note)}
                  className="rounded-full p-1 text-ink-muted transition hover:bg-white hover:text-rose-600"
                  aria-label={`Eliminar ${note.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {notes.length === 0 && (
            <p className="text-sm text-ink-muted">No hay notas creadas todavía.</p>
          )}
        </Card>
      )}

      <Modal
        open={familyModal}
        onClose={() => setFamilyModal(false)}
        title={familyForm.id ? 'Editar familia' : 'Nueva familia'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFamilyModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!familyForm.name.trim()) {
                  toast('El nombre es obligatorio', 'error')
                  return
                }
                saveFamily.mutate()
              }}
              loading={saveFamily.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre" required>
            <Input
              value={familyForm.name}
              onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })}
              placeholder="Ej. Ámbar floral"
            />
          </Field>
          <Field label="Descripción">
            <Textarea
              rows={3}
              value={familyForm.description}
              onChange={(event) =>
                setFamilyForm({ ...familyForm, description: event.target.value })
              }
              placeholder="Cálida, resinosa y envolvente…"
            />
          </Field>
          <Field label="Orden">
            <Input
              type="number"
              value={familyForm.sort_order}
              onChange={(event) =>
                setFamilyForm({ ...familyForm, sort_order: event.target.value })
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={noteModal}
        onClose={() => setNoteModal(false)}
        title={noteForm.id ? 'Editar nota' : 'Nueva nota'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!noteForm.name.trim()) {
                  toast('El nombre es obligatorio', 'error')
                  return
                }
                saveNote.mutate()
              }}
              loading={saveNote.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Nombre de la nota" required>
          <Input
            value={noteForm.name}
            onChange={(event) => setNoteForm({ ...noteForm, name: event.target.value })}
            placeholder="Ej. Vainilla"
          />
        </Field>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
          <Tags className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Las notas se asignan a los productos desde el formulario de producto.
        </p>
      </Modal>

      <ConfirmModal
        open={deleteTargetFamily !== null}
        onClose={() => setDeleteTargetFamily(null)}
        onConfirm={() => {
          if (deleteTargetFamily) deleteFamily.mutate(deleteTargetFamily.id)
        }}
        title="Eliminar familia olfativa"
        confirmText="Eliminar"
        variant="danger"
        loading={deleteFamily.isPending}
      >
        <p className="text-sm text-ink-muted">
          ¿Estás seguro de que deseas eliminar la familia{' '}
          <strong className="text-ink">{deleteTargetFamily?.name}</strong>?
          {(deleteTargetFamily?.product_count ?? 0) > 0 && (
            <span className="mt-2 block rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              Esta familia tiene {deleteTargetFamily?.product_count} producto(s) asociado(s). Se
              desvincularán de esta familia.
            </span>
          )}
        </p>
      </ConfirmModal>

      <ConfirmModal
        open={deleteTargetNote !== null}
        onClose={() => setDeleteTargetNote(null)}
        onConfirm={() => {
          if (deleteTargetNote) deleteNote.mutate(deleteTargetNote.id)
        }}
        title="Eliminar nota olfativa"
        confirmText="Eliminar"
        variant="danger"
        loading={deleteNote.isPending}
      >
        <p className="text-sm text-ink-muted">
          ¿Estás seguro de que deseas eliminar la nota olfativa{' '}
          <strong className="text-ink">{deleteTargetNote?.name}</strong>?
          {(deleteTargetNote?.usage_count ?? 0) > 0 && (
            <span className="mt-2 block rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              Esta nota se utiliza actualmente en {deleteTargetNote?.usage_count} producto(s).
            </span>
          )}
        </p>
      </ConfirmModal>
    </>
  )
}
