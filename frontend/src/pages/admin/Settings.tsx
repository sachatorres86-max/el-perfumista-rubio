import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Save, ShieldAlert } from 'lucide-react'
import { api } from '../../lib/api'
import type { PublicConfig } from '../../lib/types'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from '../../components/ui'

export function Settings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState<PublicConfig | null>(null)

  const isAdmin = user?.role === 'admin'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: api.admin.settings,
    enabled: isAdmin,
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload: Partial<PublicConfig>) => api.admin.updateSettings(payload),
    onSuccess: (saved) => {
      setForm(saved)
      toast('Configuración guardada')
      queryClient.invalidateQueries({ queryKey: ['site-config'] })
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Configuración" />
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
          <h2 className="text-xl text-ink">Acceso restringido</h2>
          <p className="max-w-md text-sm text-ink-muted">
            Solo los administradores pueden modificar la configuración del sitio. Solicita acceso
            si necesitas cambiar estos datos.
          </p>
        </Card>
      </>
    )
  }

  if (isLoading || !form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-ink-muted">No se pudo cargar la configuración.</p>
      </Card>
    )
  }

  const update = (field: keyof PublicConfig, value: string) => {
    setForm({ ...form, [field]: value })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(form)
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title="Configuración"
        description="Datos de contacto, horarios y textos del sitio público."
        actions={
          <Button type="submit" loading={mutation.isPending}>
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl text-ink">Datos del negocio</h2>
          <p className="mt-1 text-xs text-ink-muted">Se muestran en el encabezado y pie de página.</p>
          <div className="mt-4 space-y-4">
            <Field label="Nombre del negocio">
              <Input
                value={form.business_name}
                onChange={(event) => update('business_name', event.target.value)}
              />
            </Field>
            <Field label="Instagram">
              <Input
                value={form.instagram_url}
                onChange={(event) => update('instagram_url', event.target.value)}
                placeholder="https://www.instagram.com/…"
              />
            </Field>
            <Field label="Horario de atención">
              <Input value={form.hours} onChange={(event) => update('hours', event.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl text-ink">Contacto y WhatsApp</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Los enlaces de WhatsApp usan estos números.
          </p>
          <div className="mt-4 space-y-4">
            <Field label="WhatsApp principal">
              <Input
                value={form.whatsapp_primary}
                onChange={(event) => update('whatsapp_primary', event.target.value)}
                placeholder="+584126402721"
              />
            </Field>
            <Field label="WhatsApp secundario">
              <Input
                value={form.whatsapp_secondary}
                onChange={(event) => update('whatsapp_secondary', event.target.value)}
                placeholder="+584126402175"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl text-ink">Locales</h2>
          <div className="mt-4 space-y-4">
            <Field label="Local 1">
              <Input
                value={form.location_1}
                onChange={(event) => update('location_1', event.target.value)}
              />
            </Field>
            <Field label="Local 2">
              <Input
                value={form.location_2}
                onChange={(event) => update('location_2', event.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl text-ink">Textos de la página de inicio</h2>
          <div className="mt-4 space-y-4">
            <Field label="Título principal">
              <Input
                value={form.hero_title}
                onChange={(event) => update('hero_title', event.target.value)}
              />
            </Field>
            <Field label="Subtítulo">
              <Textarea
                rows={3}
                value={form.hero_subtitle}
                onChange={(event) => update('hero_subtitle', event.target.value)}
              />
            </Field>
            <Field label="Texto “Nosotros”">
              <Textarea
                rows={4}
                value={form.about_text}
                onChange={(event) => update('about_text', event.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs text-brand-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Los cambios se reflejan en el sitio público al instante. El catálogo nunca muestra
          precios; solo disponibilidad y el botón de consulta por WhatsApp.
        </p>
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={mutation.isPending}>
          <Save className="h-4 w-4" />
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
