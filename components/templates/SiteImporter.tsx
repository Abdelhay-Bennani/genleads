'use client'
import { CloseRounded, CodeRounded, DeleteOutlineRounded, FolderOpenRounded, InsertDriveFileOutlined, OpenInNewRounded } from '@mui/icons-material'
import { Alert, Box, Button, Card, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import { useRef, useState, type DragEvent } from 'react'
import { useStore } from '@/lib/client/store'
import { filesFromDrop, filesFromInput, fmtSize, prepareSite, type PickedSite, type SiteFile } from '@/lib/client/site'
import { SectionLabel } from '../ui'

const dirProps = { webkitdirectory: '', directory: '' } as Record<string, string>
export type SiteDrop = ReturnType<typeof useSiteDrop>

/** Glisser-déposer et sélection de fichiers ou d'un dossier. */
export function useSiteDrop(onPick: (s: PickedSite) => void) {
  const store = useStore()
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const filesRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)
  const take = async (load: () => Promise<SiteFile[]> | SiteFile[]) => {
    setBusy(true)
    try { onPick(await prepareSite(await load())) } catch (e) { store.notify((e as Error).message, false) } finally { setBusy(false) }
  }
  return {
    over, busy, filesRef, dirRef,
    zone: {
      onDragOver: (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(true) },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setOver(false)
        const pending = filesFromDrop(e.dataTransfer) // lecture synchrone des entrées, avant le premier await
        take(() => pending)
      },
    },
    inputs: (
      <>
        <input ref={filesRef} type="file" multiple hidden accept=".html,.htm,.css,.js,.mjs,.json,.map,.txt,.xml,.svg,.png,.jpg,.jpeg,.gif,.webp,.avif,.ico,.woff,.woff2,.ttf,.otf,.eot,.mp4,.webm,.mp3,.pdf"
          onChange={(e) => { if (e.target.files?.length) { const l = filesFromInput(e.target.files); take(() => l) } e.target.value = '' }} />
        <input ref={dirRef} type="file" multiple hidden {...dirProps}
          onChange={(e) => { if (e.target.files?.length) { const l = filesFromInput(e.target.files); take(() => l) } e.target.value = '' }} />
      </>
    ),
  }
}

/** Bandeau de la page Mes Maquettes : déposer un site crée une nouvelle maquette. */
export function SiteDropZone({ drop }: { drop: SiteDrop }) {
  return (
    <Box {...drop.zone} sx={{ mb: 2.5, p: 2, borderRadius: 3, border: '2px dashed', borderColor: drop.over ? 'primary.main' : 'divider', bgcolor: drop.over ? 'action.hover' : 'background.paper', transition: '.15s' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CodeRounded color="primary" />
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Glissez ici les fichiers d'un site HTML pour créer une maquette</Typography>
            <Typography variant="caption" color="text.secondary">index.html, CSS, JS, images, ou le dossier complet. Le bouton « Voir la démo » ouvrira le site et ses pages.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button variant="outlined" size="small" disabled={drop.busy} startIcon={<InsertDriveFileOutlined />} onClick={() => drop.filesRef.current?.click()}>Fichiers</Button>
          <Button variant="outlined" size="small" disabled={drop.busy} startIcon={<FolderOpenRounded />} onClick={() => drop.dirRef.current?.click()}>Dossier</Button>
        </Stack>
      </Stack>
      {drop.inputs}
    </Box>
  )
}

/** Section « Site HTML » de la fiche maquette. */
export function SiteImporter({ pending, existing, demoUrl, progress, onPick, onClear, onRemoveExisting }: {
  pending: PickedSite | null; existing: { files: number; size: number } | null; demoUrl: string; progress: { done: number; total: number } | null
  onPick: (s: PickedSite) => void; onClear: () => void; onRemoveExisting: () => void
}) {
  const drop = useSiteDrop(onPick)
  const shown = pending ? [...pending.files].sort((a, b) => Number(b.path === 'index.html') - Number(a.path === 'index.html')) : []
  return (
    <Box {...drop.zone}>
      <SectionLabel>Site HTML de démonstration</SectionLabel>
      <Card sx={{ p: 1.5, borderStyle: 'dashed', borderWidth: 2, borderColor: drop.over ? 'primary.main' : 'divider', bgcolor: drop.over ? 'action.hover' : undefined }}>
        {pending ? (
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{pending.files.length} fichier{pending.files.length > 1 ? 's' : ''} · {fmtSize(pending.size)} {existing ? '· remplacera le site actuel' : ''}</Typography>
              <Button size="small" color="inherit" startIcon={<CloseRounded />} disabled={!!progress} onClick={onClear}>Retirer</Button>
            </Stack>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {shown.slice(0, 12).map((f) => <Chip key={f.path} size="small" variant="outlined" label={f.path} />)}
              {shown.length > 12 && <Chip size="small" label={`+${shown.length - 12}`} />}
            </Stack>
            {pending.skipped.length > 0 && <Alert severity="warning" variant="outlined">Fichiers ignorés (type non accepté) : {pending.skipped.slice(0, 6).join(', ')}{pending.skipped.length > 6 ? '…' : ''}</Alert>}
            {progress ? <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} /> : <Typography variant="caption" color="text.secondary">Le site sera mis en ligne à l'enregistrement de la maquette.</Typography>}
          </Stack>
        ) : existing ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Site en ligne : {existing.files} fichier{existing.files > 1 ? 's' : ''} · {fmtSize(existing.size)}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<OpenInNewRounded />} href={demoUrl} target="_blank">Ouvrir</Button>
              <Button size="small" variant="outlined" startIcon={<FolderOpenRounded />} onClick={() => drop.dirRef.current?.click()}>Remplacer</Button>
              <Button size="small" color="error" startIcon={<DeleteOutlineRounded />} onClick={onRemoveExisting}>Retirer</Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
            <Typography variant="body2" color="text.secondary">Glissez vos fichiers HTML, CSS, JS ou le dossier du site (avec index.html).</Typography>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button size="small" variant="outlined" disabled={drop.busy} startIcon={<InsertDriveFileOutlined />} onClick={() => drop.filesRef.current?.click()}>Fichiers</Button>
              <Button size="small" variant="outlined" disabled={drop.busy} startIcon={<FolderOpenRounded />} onClick={() => drop.dirRef.current?.click()}>Dossier</Button>
            </Stack>
          </Stack>
        )}
      </Card>
      {drop.inputs}
    </Box>
  )
}
