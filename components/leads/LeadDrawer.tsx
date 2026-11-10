'use client'
import {
  AlarmRounded, CallRounded, CheckRounded, ContentCopyRounded, DeleteOutlineRounded, DescriptionOutlined, DesktopWindowsOutlined, EmailOutlined,
  EventRounded, LanguageRounded, LinkRounded, NotesRounded, OpenInNewRounded, PictureAsPdfOutlined, PlaceOutlined, SendRounded, SlideshowRounded, SmsOutlined, StarRounded,
} from '@mui/icons-material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import {
  Alert, Box, Button, ButtonGroup, Card, CardActionArea, Checkbox, Chip, Divider, Drawer, Grid, IconButton, InputBase, MenuItem, Stack, Tab, Tabs,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { imgUrl } from '@/lib/client/images'
import { useStore } from '@/lib/client/store'
import { suggestPacks, useApplyTemplateToQuote } from '@/lib/client/templates'
import { NEEDS, PACK_CATEGORIES, STATUSES } from '@/lib/shared/data'
import type { InteractionType, Prospect } from '@/lib/shared/types'
import { addDays, ensureHttp, eur, fmtDate, fmtDateTime, followState, mapsUrl, quote, telHref, todayISO, uid } from '@/lib/shared/utils'
import { QuoteDialog } from '../quote/QuoteDialog'
import { QuoteList } from '../quote/QuoteList'
import { PresentationRow } from '../templates/PresentationRow'
import { usePresenter } from '../templates/PresenterContext'
import { SectionLabel, UserAvatar } from '../ui'

export type LeadTab = 'infos' | 'journal' | 'devis' | 'maquettes'
const TYPES: { id: InteractionType; icon: typeof CallRounded }[] = [
  { id: 'Appel', icon: CallRounded }, { id: 'Email', icon: EmailOutlined }, { id: 'SMS', icon: SmsOutlined }, { id: 'RDV', icon: EventRounded }, { id: 'Note', icon: NotesRounded },
]

export function LeadDrawer({ id, draft: initialDraft, initialTab, onClose, onCreated }: {
  id: string | null; draft: Prospect | null; initialTab: LeadTab; onClose: () => void; onCreated: (id: string) => void
}) {
  const store = useStore()
  const presenter = usePresenter()
  const isNew = !!initialDraft
  const [draft, setDraft] = useState<Prospect | null>(initialDraft)
  const p = isNew ? draft : store.prospects.find((x) => x.id === id) ?? null
  const [tab, setTab] = useState<LeadTab>(initialTab)
  const [confirmDel, setConfirmDel] = useState(false)
  if (!p) return null
  const patch = (ch: Partial<Prospect>) => (isNew ? setDraft({ ...p, ...ch }) : store.updateProspect(p.id, ch))
  const fs = followState(p)
  const create = () => { if (p.company.trim()) { store.saveProspect(p); onCreated(p.id) } }

  return (
    <Drawer anchor="right" open onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 660 }, display: 'flex' } } }}>
      {/* En-tête */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.25, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <InputBase value={p.company} onChange={(e) => patch({ company: e.target.value })} placeholder="Nom de l'entreprise" autoFocus={isNew} fullWidth
            sx={{ fontSize: 24, fontWeight: 600 }} />
          <IconButton onClick={onClose} aria-label="Fermer"><CloseRounded /></IconButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
          <TextField select size="small" value={p.status} onChange={(e) => patch({ status: e.target.value as Prospect['status'] })} sx={{ width: 200 }} fullWidth={false}>
            {STATUSES.map((s) => <MenuItem key={s.id} value={s.id}><Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.hex, mr: 1, display: 'inline-block' }} />{s.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" value={p.assignee ?? ''} onChange={(e) => patch({ assignee: e.target.value || null })} sx={{ width: 180 }} fullWidth={false}
            slotProps={{ select: { displayEmpty: true, renderValue: (v) => <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><UserAvatar name={(v as string) || null} size={20} /><span>{(v as string) || 'Non assigné'}</span></Stack> } }}>
            <MenuItem value="">Non assigné</MenuItem>
            {[...store.members, ...(p.assignee && !store.members.includes(p.assignee) ? [p.assignee] : [])].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, overflowX: 'auto', pb: 0.25 }}>
          <Button size="small" variant="contained" startIcon={<CallRounded />} href={p.phone ? telHref(p.phone) : '#'} disabled={!p.phone}>Appeler</Button>
          <Button size="small" variant="outlined" startIcon={<EmailOutlined />} href={p.email ? `mailto:${p.email}` : '#'} disabled={!p.email}>Email</Button>
          <Button size="small" variant="outlined" startIcon={<LanguageRounded />} href={p.url ? ensureHttp(p.url) : '#'} target="_blank" disabled={!p.url}>Site</Button>
          <Button size="small" variant="outlined" startIcon={<PlaceOutlined />} href={mapsUrl(`${p.company} ${p.city}`)} target="_blank">Maps</Button>
          <Button size="small" variant="outlined" startIcon={<DesktopWindowsOutlined />} disabled={isNew} onClick={() => presenter.share({ prospectId: p.id })}>Maquettes</Button>
        </Stack>
        <Alert icon={<AlarmRounded fontSize="small" />} severity={fs === 'overdue' ? 'error' : fs === 'today' ? 'warning' : 'info'} variant="outlined"
          sx={{ mt: 1.5, py: 0.25, alignItems: 'center', '& .MuiAlert-message': { width: '100%' } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {fs === 'overdue' ? `Relance en retard (${fmtDate(p.nextFollowUp)})` : fs === 'today' ? "Relance aujourd'hui" : 'Prochaine relance'}
            </Typography>
            <TextField type="date" size="small" value={p.nextFollowUp ?? ''} onChange={(e) => patch({ nextFollowUp: e.target.value || null })} sx={{ width: 160 }} fullWidth={false} />
            {[['+1j', 1], ['+3j', 3], ['+1 sem', 7]].map(([l, n]) => <Chip key={l} size="small" label={l} onClick={() => patch({ nextFollowUp: addDays(todayISO(), n as number) })} />)}
            {p.nextFollowUp && <Chip size="small" variant="outlined" label="Effacer" onClick={() => patch({ nextFollowUp: null })} />}
          </Stack>
        </Alert>
      </Box>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: { xs: 1, sm: 2 }, borderBottom: 1, borderColor: 'divider' }} variant="scrollable">
        <Tab value="infos" label="Infos" />
        <Tab value="journal" label={`Journal (${p.interactions.length})`} />
        <Tab value="devis" label="Devis" />
        <Tab value="maquettes" label="Maquettes" />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2.5 }}>
        {tab === 'infos' && <InfosTab p={p} patch={patch} />}
        {tab === 'journal' && <JournalTab p={p} isNew={isNew} patch={patch} />}
        {tab === 'devis' && <DevisTab p={p} patch={patch} isNew={isNew} />}
        {tab === 'maquettes' && <MaquettesTab p={p} isNew={isNew} goDevis={() => setTab('devis')} />}
      </Box>

      <Stack direction="row" sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: 1, borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        {isNew ? (
          <>
            <Typography variant="caption" color="text.secondary">{p.company.trim() ? '' : "Renseignez au moins le nom de l'entreprise"}</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={onClose}>Annuler</Button>
              <Button variant="contained" startIcon={<CheckRounded />} onClick={create} disabled={!p.company.trim()}>Créer le prospect</Button>
            </Stack>
          </>
        ) : (
          <>
            {store.isSuper ? (confirmDel ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" color="error">Supprimer définitivement ?</Typography>
                <Button size="small" color="error" variant="outlined" onClick={() => { store.deleteProspect(p.id); onClose() }}>Oui</Button>
                <Button size="small" onClick={() => setConfirmDel(false)}>Non</Button>
              </Stack>
            ) : <Button size="small" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmDel(true)}>Supprimer</Button>) : <span />}
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>Enregistré automatiquement · {fmtDateTime(p.updatedAt)}</Typography>
          </>
        )}
      </Stack>
    </Drawer>
  )
}

/** Secteur d'activité en texte libre (plusieurs secteurs séparés par des virgules). */
function SectorField({ sectors, onChange }: { sectors: string[]; onChange: (s: string[]) => void }) {
  const [text, setText] = useState(sectors.join(', '))
  const parse = (v: string) => [...new Set(v.split(/[,;]/).map((x) => x.trim()).filter(Boolean))]
  return (
    <TextField
      label="Secteur d'activité"
      placeholder="Ex. : Plomberie, Chauffage"
      value={text}
      onChange={(e) => { setText(e.target.value); onChange(parse(e.target.value)) }}
      onBlur={() => setText(parse(text).join(', '))}
      helperText="Texte libre — séparez plusieurs secteurs par une virgule"
    />
  )
}

function InfosTab({ p, patch }: { p: Prospect; patch: (c: Partial<Prospect>) => void }) {
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Contact principal" value={p.contact} onChange={(e) => patch({ contact: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Téléphone" type="tel" value={p.phone} onChange={(e) => patch({ phone: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email" type="email" value={p.email} onChange={(e) => patch({ email: e.target.value })} /></Grid>
        <Grid size={{ xs: 8, sm: 4 }}><TextField label="Ville" value={p.city} onChange={(e) => patch({ city: e.target.value })} /></Grid>
        <Grid size={{ xs: 4, sm: 2 }}><TextField label="CP" value={p.postalCode} onChange={(e) => patch({ postalCode: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, sm: 'auto' }}>
          <ToggleButtonGroup size="small" exclusive value={p.hasWebsite ? 'oui' : 'non'} onChange={(_e, v) => v && patch({ hasWebsite: v === 'oui' })}>
            <ToggleButton value="oui" sx={{ px: 2 }}>Site : Oui</ToggleButton>
            <ToggleButton value="non" sx={{ px: 2 }}>Non</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid size={{ xs: 12, sm: 'grow' }}>
          <TextField label="URL du site" value={p.url} onChange={(e) => patch({ url: e.target.value })} disabled={!p.hasWebsite}
            slotProps={{ input: { endAdornment: p.url ? <IconButton size="small" href={ensureHttp(p.url)} target="_blank"><OpenInNewRounded fontSize="small" /></IconButton> : undefined } }} />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField select label="Type de besoin" value={p.need} onChange={(e) => patch({ need: e.target.value as Prospect['need'] })}>
            <MenuItem value="">— Non défini</MenuItem>
            {NEEDS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField label="Budget estimé (€)" type="number" value={p.budget ?? ''} onChange={(e) => patch({ budget: e.target.value === '' ? null : Number(e.target.value) })} />
        </Grid>
      </Grid>
      <SectorField key={p.id} sectors={p.sectors} onChange={(sectors) => patch({ sectors })} />
      <TextField label="Description de l'activité" multiline minRows={3} value={p.activity} onChange={(e) => patch({ activity: e.target.value })} />
      <Typography variant="caption" color="text.secondary">Source : {p.source || '—'} · créé le {fmtDateTime(p.createdAt)}</Typography>
    </Stack>
  )
}

function JournalTab({ p, isNew, patch }: { p: Prospect; isNew: boolean; patch: (c: Partial<Prospect>) => void }) {
  const store = useStore()
  const [type, setType] = useState<InteractionType>('Appel')
  const [text, setText] = useState('')
  const [follow, setFollow] = useState<number | null>(null)
  const add = () => {
    if (!text.trim()) return
    if (isNew) patch({ interactions: [{ id: uid(), date: new Date().toISOString(), author: store.me.name, type, text: text.trim() }, ...p.interactions] })
    else store.addInteraction(p.id, { type, text: text.trim() })
    if (follow) patch({ nextFollowUp: addDays(todayISO(), follow) })
    setText(''); setFollow(null)
  }
  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={type} onChange={(_e, v) => v && setType(v)} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          {TYPES.map(({ id, icon: I }) => <ToggleButton key={id} value={id} sx={{ gap: 0.5, px: 1.25 }}><I sx={{ fontSize: 16 }} />{id}</ToggleButton>)}
        </ToggleButtonGroup>
        <TextField multiline minRows={3} placeholder="Compte-rendu de l'appel, objections, prochaine étape…" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add() }} />
        <Stack direction="row" sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Relancer dans</Typography>
            {[1, 3, 7, 14].map((n) => <Chip key={n} size="small" label={n === 7 ? '1 sem' : n === 14 ? '2 sem' : `${n}j`} color={follow === n ? 'warning' : 'default'} onClick={() => setFollow(follow === n ? null : n)} />)}
          </Stack>
          <Button variant="contained" size="small" startIcon={<SendRounded />} onClick={add} disabled={!text.trim()}>Ajouter au journal</Button>
        </Stack>
      </Card>
      {p.interactions.length === 0 ? <Typography color="text.secondary" align="center" variant="body2">Aucun échange enregistré pour l'instant.</Typography> : (
        <Stack spacing={2} sx={{ borderLeft: 2, borderColor: 'divider', pl: 2.5, ml: 1 }}>
          {p.interactions.map((i) => {
            const T = TYPES.find((t) => t.id === i.type) ?? TYPES[4]
            return (
              <Box key={i.id} sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: -33, top: 0, width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'background.paper', border: 1, borderColor: 'primary.main', color: 'primary.light' }}>
                  <T.icon sx={{ fontSize: 13 }} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{i.type}</Typography>
                  <Typography variant="caption" color="text.secondary">{fmtDateTime(i.date)}</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}><UserAvatar name={i.author} size={18} /><Typography variant="caption" color="text.secondary">{i.author}</Typography></Stack>
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{i.text}</Typography>
              </Box>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}

function DevisTab({ p, patch, isNew }: { p: Prospect; patch: (c: Partial<Prospect>) => void; isNew: boolean }) {
  const store = useStore()
  const packs = store.packs.filter((k) => k.active || p.packIds.includes(k.id))
  const q = quote(p, store.packs)
  const [copied, setCopied] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const quotes = store.quotes.filter((x) => x.leadId === p.id)
  const toggle = (id: string) => patch({ packIds: p.packIds.includes(id) ? p.packIds.filter((x) => x !== id) : [...p.packIds, id] })
  const tpl = p.templateId ? store.templates.find((t) => t.id === p.templateId) ?? null : null
  const suggested = tpl ? suggestPacks(tpl, p, store.packs).filter((id) => !p.packIds.includes(id)) : []

  const proposal = useMemo(() => {
    if (!q.sel.length) return ''
    const lines = q.sel.map((k) => `• ${k.name} — ${eur(k.price)} HT${k.billing === 'monthly' ? ' / mois' : ''}\n   ${k.description}`)
    const parts = [`Bonjour${p.contact ? ' ' + p.contact : ''},`, '', `Suite à notre échange, voici notre proposition pour ${p.company || 'votre entreprise'}${p.city ? ` (${p.city})` : ''} :`, '', ...lines, '']
    if (tpl) {
      parts.push(`Base graphique retenue : « ${tpl.name} » (${tpl.siteType}).`)
      if (tpl.description || tpl.shortDescription) parts.push(tpl.description || tpl.shortDescription)
      if (tpl.features.length) parts.push(`Inclus : ${tpl.features.join(', ')}.`)
      if (tpl.demoUrl) parts.push(`Aperçu en ligne : ${tpl.demoUrl}`)
      parts.push('')
    }
    if (q.oneShotRaw) {
      if (p.discount) parts.push(`Sous-total création : ${eur(q.oneShotRaw)} HT`, `Remise exceptionnelle : -${p.discount} %`)
      parts.push(`Total à la mise en ligne : ${eur(q.oneShot)} HT`)
    }
    if (q.mrr) parts.push(`Abonnement mensuel : ${eur(q.mrr)} HT / mois (sans engagement au-delà de 12 mois)`)
    parts.push('', 'Délai indicatif : 2 à 3 semaines après réception de vos contenus.', 'Je reste disponible pour en discuter par téléphone.', '', 'Bien cordialement,', store.me.name)
    return parts.join('\n')
  }, [q, p, store.me.name, tpl])

  const markSent = () => {
    patch({ status: 'devis', nextFollowUp: addDays(todayISO(), 3) })
    if (!isNew) store.addInteraction(p.id, { type: 'Email', text: `Devis envoyé : ${q.sel.map((k) => k.name).join(' + ')} — ${eur(q.oneShot)} HT${q.mrr ? ` + ${eur(q.mrr)}/mois` : ''}` })
  }

  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><DesktopWindowsOutlined fontSize="small" color="secondary" /><Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Maquette associée</Typography></Stack>
          <TextField select size="small" value={p.templateId ?? ''} onChange={(e) => patch({ templateId: e.target.value || null, templateIdUpdatedAt: new Date().toISOString() })}
            slotProps={{ select: { displayEmpty: true } }}>
            <MenuItem value="">— Aucune</MenuItem>
            {store.templates.filter((t) => t.status === 'active' || t.id === p.templateId).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          {suggested.length > 0 && <Button size="small" variant="contained" sx={{ whiteSpace: 'nowrap' }} onClick={() => patch({ packIds: [...p.packIds, ...suggested] })}>+ {store.packs.filter((k) => suggested.includes(k.id)).map((k) => k.name).join(', ')}</Button>}
        </Stack>
      </Card>

      {PACK_CATEGORIES.map((c) => {
        const list = packs.filter((k) => k.category === c.id)
        if (!list.length) return null
        return (
          <Box key={c.id}>
            <SectionLabel>{c.label}</SectionLabel>
            <Stack spacing={1}>
              {list.map((k) => {
                const on = p.packIds.includes(k.id)
                return (
                  <Card key={k.id} sx={{ borderColor: on ? 'primary.main' : undefined, bgcolor: on ? 'action.selected' : undefined }}>
                    <CardActionArea onClick={() => toggle(k.id)} sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Checkbox checked={on} size="small" sx={{ p: 0, mt: 0.25 }} tabIndex={-1} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{k.description}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{eur(k.price)}{k.billing === 'monthly' && <Typography component="span" variant="caption" color="text.secondary">/mois</Typography>}</Typography>
                    </CardActionArea>
                  </Card>
                )
              })}
            </Stack>
          </Box>
        )
      })}

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 4 }}><Card sx={{ p: 1.75 }}><Typography variant="caption" color="text.secondary">Total one-shot</Typography><Typography variant="h5">{eur(q.oneShot)}</Typography>{p.discount > 0 && q.oneShotRaw > 0 && <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>{eur(q.oneShotRaw)}</Typography>}</Card></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><Card sx={{ p: 1.75 }}><Typography variant="caption" color="text.secondary">MRR récurrent</Typography><Typography variant="h5" color="success.main">{eur(q.mrr)}<Typography component="span" variant="caption">/mois</Typography></Typography>{q.mrr > 0 && <Typography variant="caption" color="text.secondary">{eur(q.mrr * 12)} / an</Typography>}</Card></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><Card sx={{ p: 1.75 }}><TextField label="Remise one-shot (%)" type="number" value={p.discount || ''} onChange={(e) => patch({ discount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></Card></Grid>
      </Grid>

      {proposal ? (
        <Box>
          <SectionLabel>Proposition commerciale (générée)</SectionLabel>
          <Box component="pre" sx={{ m: 0, p: 2, maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>{proposal}</Box>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            <Button size="small" variant="outlined" startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />} onClick={async () => { try { await navigator.clipboard.writeText(proposal); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ } }}>{copied ? 'Copié' : 'Copier'}</Button>
            <Button size="small" variant="outlined" startIcon={<EmailOutlined />} disabled={!p.email} href={`mailto:${p.email}?subject=${encodeURIComponent(`Proposition site web – ${p.company}`)}&body=${encodeURIComponent(proposal)}`}>Ouvrir dans ma messagerie</Button>
            <Button size="small" variant="contained" startIcon={<SendRounded />} onClick={markSent} disabled={p.status === 'devis'}>Marquer « Devis envoyé »</Button>
          </Stack>
          {p.status !== 'devis' && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Passe le statut à « Devis envoyé », l'ajoute au journal et programme une relance à J+3.</Typography>}
        </Box>
      ) : <Alert severity="info" variant="outlined">Cochez un ou plusieurs packs pour chiffrer et générer la proposition.</Alert>}

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SectionLabel>Devis PDF émis</SectionLabel>
          <Button size="small" variant="contained" startIcon={<PictureAsPdfOutlined />} disabled={isNew || !q.sel.length} onClick={() => setIssuing(true)}>Émettre le devis PDF</Button>
        </Stack>
        {quotes.length ? <QuoteList quotes={quotes} /> : <Typography variant="caption" color="text.secondary">{isNew ? 'Créez d’abord le prospect.' : 'Aucun devis émis pour ce lead.'}</Typography>}
      </Box>
      {issuing && <QuoteDialog lead={p} packIds={q.sel.map((k) => k.id)} discount={p.discount || 0} onClose={() => setIssuing(false)} />}
    </Stack>
  )
}

function MaquettesTab({ p, isNew, goDevis }: { p: Prospect; isNew: boolean; goDevis: () => void }) {
  const store = useStore()
  const presenter = usePresenter()
  const apply = useApplyTemplateToQuote()
  if (isNew) return <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Créez d'abord le prospect pour lui présenter des maquettes.</Typography>
  const tpl = p.templateId ? store.templates.find((t) => t.id === p.templateId) : undefined
  const cover = tpl ? store.coverOf(tpl) : undefined
  const pres = store.templatePresentations.filter((x) => x.prospectId === p.id)
  const choices = store.templateClientSelections.filter((x) => x.prospectId === p.id)
  const active = store.templates.filter((t) => t.status === 'active')
  return (
    <Stack spacing={3}>
      <ButtonGroup>
        <Button variant="contained" startIcon={<LinkRounded />} onClick={() => presenter.share({ prospectId: p.id })}>Présenter des maquettes</Button>
        <Button variant="outlined" startIcon={<SlideshowRounded />} disabled={!active.length} onClick={() => presenter.present({ templateIds: active.map((t) => t.id), prospectId: p.id })}>Mode présentation</Button>
      </ButtonGroup>
      <Box>
        <SectionLabel>Maquette retenue</SectionLabel>
        {tpl ? (
          <Card sx={{ p: 1.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <Box sx={{ width: 140, height: 88, borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover', flexShrink: 0 }}>{cover && <Box component="img" src={imgUrl(cover.thumb)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}><StarRounded sx={{ color: '#5539d9', fontSize: 18 }} /><Typography sx={{ fontWeight: 600 }}>{tpl.name}</Typography></Stack>
                <Typography variant="caption" color="text.secondary">{store.categoryName(tpl.categoryId)} · {tpl.siteType}</Typography>
                {tpl.demoUrl && <Box><Button size="small" href={tpl.demoUrl} target="_blank" startIcon={<OpenInNewRounded />} sx={{ px: 0 }}>Voir la démo</Button></Box>}
              </Box>
              <Button variant="contained" size="small" startIcon={<DescriptionOutlined />} onClick={() => { apply(p, tpl); goDevis() }}>Créer le devis</Button>
            </Stack>
          </Card>
        ) : <Alert severity="info" variant="outlined">Aucune maquette choisie pour l'instant. Elle apparaîtra ici dès que le client aura fait son choix.</Alert>}
      </Box>
      {choices.length > 0 && (
        <Box>
          <SectionLabel>Choix du client</SectionLabel>
          <Stack spacing={1}>
            {choices.map((c) => (
              <Alert key={c.id} icon={<StarRounded fontSize="small" />} severity="warning" variant="outlined">
                <b>{store.templates.find((t) => t.id === c.templateId)?.name ?? 'Maquette supprimée'}</b>
                <Typography component="span" variant="caption" color="text.secondary"> · {fmtDateTime(c.createdAt)}{c.clientName ? ` · ${c.clientName}` : ''}{c.presentationId ? ' · via lien' : ' · en rendez-vous'}</Typography>
                {c.message && <Typography variant="body2" sx={{ mt: 0.5 }}>« {c.message} »</Typography>}
              </Alert>
            ))}
          </Stack>
        </Box>
      )}
      <Box>
        <SectionLabel>Liens de présentation ({pres.length})</SectionLabel>
        {pres.length ? <Card>{pres.map((x, i) => <Box key={x.id}>{i > 0 && <Divider />}<PresentationRow id={x.id} showProspect={false} /></Box>)}</Card>
          : <Typography variant="body2" color="text.secondary">Aucun lien envoyé.</Typography>}
      </Box>
    </Stack>
  )
}
