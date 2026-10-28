import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './ui'

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  children?: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark'
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose()
      }}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" disabled={loading} onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

