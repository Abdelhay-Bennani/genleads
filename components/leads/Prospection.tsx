'use client'
import { AddRounded, CheckRounded, ContentCopyRounded, DeleteOutlineRounded, MapOutlined, PersonAddAlt1Rounded, SearchRounded } from '@mui/icons-material'
import {
  Autocomplete, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import { useState } from 'react'
import { useStore } from '@/lib/client/store'
import { KEYWORD_CATS, SECTORS } from '@/lib/shared/data'
import type { KeywordCat, KeywordQuery, Prospect } from '@/lib/shared/types'
import { googleUrl, mapsUrl, uid } from '@/lib/shared/utils'

const PARAMS_KEY = 'agenceflow:prospection'
const TERMS = ['chauffagiste', 'plombier', 'climatisation', 'paysagiste', 'électricien', 'maçon', 'menuisier', 'peintre en bâtiment', 'couvreur', 'salle de bain', 'rénovation']
const TERM_TO_SECTOR: Record<string, string> = {
  chauffagiste: 'Chauffage', plombier: 'Plomberie', climatisation: 'Climatisation', paysagiste: 'Paysagiste', 'électricien': 'Électricité',
  'maçon': 'Maçonnerie', menuisier: 'Menuiserie', 'peintre en bâtiment': 'Peinture', couvreur: 'Toiture', 'salle de bain': 'Salle de bain', 'rénovation': 'BTP',
}

export function Prospection({ onConvert }: { onConvert: (seed: Partial<Prospect>) => void }) {
  const store = useStore()
  const [params, setParams] = useState<{ secteur: string; ville: string }>(() => {
    try { return JSON.parse(localStorage.getItem(PARAMS_KEY) || '') } catch { return { secteur: 'chauffagiste', ville: 'Marseille' } }
  })
  const save = (p: typeof params) => { setParams(p); try { localStorage.setItem(PARAMS_KEY, JSON.stringify(p)) } catch { /* noop */ } }
  const [cat, setCat] = useState<KeywordCat>('artisans')
  const [copied, setCopied] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const resolve = (q: string) => q.replace(/\{secteur\}/g, params.secteur.trim()).replace(/\{ville\}/g, params.ville.trim()).replace(/\s+/g, ' ').trim()
  const list = store.keywords.filter((k) => k.category === cat)

  const convert = (k: KeywordQuery) => {
    const t = params.secteur.trim().toLowerCase()
    const sec = TERM_TO_SECTOR[t] ?? SECTORS.find((s) => s.toLowerCase() === t)
    onConvert({ city: params.ville.trim(), sectors: sec ? [sec] : [], source: `Recherche : ${resolve(k.query)}` })
  }

  return (
    <>
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <Autocomplete freeSolo options={TERMS} value={params.secteur} onInputChange={(_e, v) => save({ ...params, secteur: v })} sx={{ flex: 1 }}
            renderInput={(p) => <TextField {...p} label="Métier / secteur → {secteur}" />} />
          <TextField label="Ville → {ville}" value={params.ville} onChange={(e) => save({ ...params, ville: e.target.value })} sx={{ flex: 1 }} />
          <Button variant="outlined" startIcon={<MapOutlined />} href={mapsUrl(`${params.secteur} ${params.ville}`)} target="_blank" sx={{ whiteSpace: 'nowrap' }}>Voir sur Google Maps</Button>
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setAdding(true)} sx={{ whiteSpace: 'nowrap' }}>Nouvelle requête</Button>
        </Stack>
      </Card>
      <Tabs value={cat} onChange={(_e, v) => setCat(v)} variant="scrollable" sx={{ mb: 1 }}>
        {KEYWORD_CATS.map((c) => <Tab key={c.id} value={c.id} label={`${c.label} (${store.keywords.filter((k) => k.category === c.id).length})`} />)}
      </Tabs>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{KEYWORD_CATS.find((c) => c.id === cat)?.hint}</Typography>
      <Card>
        {list.map((k, i) => (
          <Box key={k.id}>
            {i > 0 && <Divider />}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 1.75, alignItems: { sm: 'center' } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.label}</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'ui-monospace, monospace', color: 'secondary.main' }} noWrap component="p" title={resolve(k.query)}>{resolve(k.query)}</Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button size="small" variant="contained" startIcon={<SearchRounded />} href={googleUrl(resolve(k.query))} target="_blank">Lancer la recherche</Button>
                <Tooltip title="Copier la requête"><IconButton size="small" onClick={async () => { try { await navigator.clipboard.writeText(resolve(k.query)); setCopied(k.id); setTimeout(() => setCopied(null), 1200) } catch { /* noop */ } }}>{copied === k.id ? <CheckRounded fontSize="small" /> : <ContentCopyRounded fontSize="small" />}</IconButton></Tooltip>
                <Tooltip title="Convertir en lead"><IconButton size="small" onClick={() => convert(k)}><PersonAddAlt1Rounded fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Supprimer"><IconButton size="small" onClick={() => store.setKeywords(store.keywords.filter((x) => x.id !== k.id))}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
              </Stack>
            </Stack>
          </Box>
        ))}
        {!list.length && <Typography color="text.secondary" align="center" sx={{ p: 4 }}>Aucune requête dans cette catégorie.</Typography>}
      </Card>
      {adding && <AddQuery defaultCat={cat} onClose={() => setAdding(false)} onSave={(k) => { store.setKeywords([...store.keywords, k]); setCat(k.category); setAdding(false) }} />}
    </>
  )
}

function AddQuery({ defaultCat, onSave, onClose }: { defaultCat: KeywordCat; onSave: (k: KeywordQuery) => void; onClose: () => void }) {
  const [k, setK] = useState<KeywordQuery>({ id: uid(), category: defaultCat, label: '', query: '' })
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nouvelle requête</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Catégorie" value={k.category} onChange={(e) => setK({ ...k, category: e.target.value as KeywordCat })}>{KEYWORD_CATS.map((c) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}</TextField>
          <TextField label="Nom" value={k.label} onChange={(e) => setK({ ...k, label: e.target.value })} placeholder="ex. Artisans sans site" />
          <TextField label="Requête Google" autoFocus value={k.query} onChange={(e) => setK({ ...k, query: e.target.value })} placeholder='"{secteur}" "{ville}" -site:pagesjaunes.fr' slotProps={{ htmlInput: { style: { fontFamily: 'ui-monospace, monospace' } } }} />
          <Typography variant="caption" color="text.secondary">{'{secteur}'} et {'{ville}'} sont remplacés par les valeurs choisies en haut de page.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={!k.query.trim()} onClick={() => onSave({ ...k, label: k.label.trim() || k.query.trim() })}>Ajouter</Button></DialogActions>
    </Dialog>
  )
}
