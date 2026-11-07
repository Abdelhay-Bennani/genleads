'use client'
import {
  ArrowBackRounded, ArrowForwardRounded, BusinessCenterOutlined, CheckCircleRounded, CheckRounded, ContentCopyRounded, LanguageRounded,
  PersonSearchOutlined, PictureAsPdfOutlined, RadioButtonUncheckedRounded, RestartAltRounded, ShieldOutlined, TrendingUpRounded,
} from '@mui/icons-material'
import {
  Alert, Autocomplete, Box, Button, Card, CardActionArea, Divider, Grid, LinearProgress, Stack, Step, StepButton, Stepper, TextField,
  ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import { useMemo, useState, type ReactNode } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { useStore } from '@/lib/client/store'
import type { Pack, PackCategory, Prospect } from '@/lib/shared/types'
import { QuoteDialog } from './QuoteDialog'
import { eur, isClosed } from '@/lib/shared/utils'

type Mode = 'lead' | 'libre'

/** Étapes du parcours. `pick` : choix unique (une seule offre) ou multiple (options cumulables). */
const STEPS: { id: string; label: string; icon: ReactNode; category?: PackCategory; pick?: 'one' | 'many'; title: string; hint: string }[] = [
  { id: 'client', label: 'Client', icon: <PersonSearchOutlined />, title: 'Pour qui est ce devis ?', hint: 'Choisissez un lead pour lui appliquer le devis, ou faites une simulation libre.' },
  { id: 'site', label: 'Site web', icon: <LanguageRounded />, category: 'site', pick: 'one', title: 'Quel site web ?', hint: 'Une seule formule. Passez à l’étape suivante si le client n’a pas besoin de site.' },
  { id: 'seo', label: 'SEO & visibilité', icon: <TrendingUpRounded />, category: 'seo', pick: 'many', title: 'Booster la visibilité ?', hint: 'Options cumulables : cochez tout ce qui s’applique.' },
  { id: 'maintenance', label: 'Maintenance', icon: <ShieldOutlined />, category: 'maintenance', pick: 'one', title: 'Quelle maintenance ?', hint: 'Une formule mensuelle, ou aucune.' },
  { id: 'recap', label: 'Récapitulatif', icon: <CheckCircleRounded />, title: 'Récapitulatif du devis', hint: 'Ajustez la remise puis appliquez le devis au lead ou copiez-le.' },
]

export function QuoteWizard() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>('lead')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const [discount, setDiscount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)
  const [pdf, setPdf] = useState(false)

  const leads = useMemo(() => store.prospects.filter((p) => !isClosed(p) || p.id === leadId), [store.prospects, leadId])
  const lead = leadId ? store.prospects.find((p) => p.id === leadId) ?? null : null
  const chosen = store.packs.filter((k) => sel.includes(k.id))
  const oneShotRaw = chosen.filter((k) => k.billing === 'oneshot').reduce((t, k) => t + k.price, 0)
  const oneShot = oneShotRaw * (1 - discount / 100)
  const mrr = chosen.filter((k) => k.billing === 'monthly').reduce((t, k) => t + k.price, 0)
  const cur = STEPS[step]
  const last = step === STEPS.length - 1
  const canNext = step !== 0 || mode === 'libre' || !!lead

  const pickLead = (p: Prospect | null) => {
    setLeadId(p?.id ?? null)
    setApplied(false)
    // On repart du devis déjà présent sur la fiche, pour le modifier plutôt que l'écraser à l'aveugle
    if (p) { setSel(p.packIds.filter((id) => store.packs.some((k) => k.id === id))); setDiscount(p.discount || 0) }
  }
  const toggle = (k: Pack, pick: 'one' | 'many') => {
    setApplied(false)
    setSel((s) => {
      if (s.includes(k.id)) return s.filter((x) => x !== k.id)
      if (pick === 'one') return [...s.filter((x) => store.packs.find((p) => p.id === x)?.category !== k.category), k.id]
      return [...s, k.id]
    })
  }
  const reset = () => { setStep(0); setMode('lead'); setLeadId(null); setSel([]); setDiscount(0); setApplied(false) }
  const apply = () => {
    if (!lead) return
    store.updateProspect(lead.id, { packIds: sel, discount })
    setApplied(true)
    store.notify(`Devis appliqué à ${lead.company}`)
  }

  const summary = useMemo(() => {
    const lines = chosen.map((k) => `• ${k.name} — ${eur(k.price)} HT${k.billing === 'monthly' ? ' / mois' : ''}`)
    const out = [`Devis${lead ? ` — ${lead.company}` : ''}`, '', ...lines, '']
    if (oneShotRaw) {
      if (discount) out.push(`Sous-total création : ${eur(oneShotRaw)} HT`, `Remise : -${discount} %`)
      out.push(`Total à la mise en ligne : ${eur(oneShot)} HT`)
    }
    if (mrr) out.push(`Abonnement mensuel : ${eur(mrr)} HT / mois`)
    out.push(`Valeur 1re année : ${eur(oneShot + mrr * 12)} HT`)
    return out.join('\n')
  }, [chosen, lead, oneShotRaw, oneShot, mrr, discount])

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card sx={{ overflow: 'hidden' }}>
          <LinearProgress variant="determinate" value={((step + 1) / STEPS.length) * 100} sx={{ height: 3 }} />
          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5 }}>
            {compact ? (
              <Typography variant="overline" color="text.secondary">Étape {step + 1} / {STEPS.length} · {cur.label}</Typography>
            ) : (
              <Stepper nonLinear activeStep={step} alternativeLabel>
                {STEPS.map((s, i) => {
                  const n = s.category ? sel.filter((id) => store.packs.find((k) => k.id === id)?.category === s.category).length : 0
                  const done = i < step && (i === 0 ? (mode === 'libre' || !!lead) : !s.category || n > 0)
                  return (
                    <Step key={s.id} completed={done}>
                      {/* On ne peut sauter en avant que si l'étape client est remplie */}
                      <StepButton onClick={() => (i <= step || canNext) && setStep(i)} optional={s.category && n > 0 ? <Typography variant="caption" color="primary.light">{n} choisi{n > 1 ? 's' : ''}</Typography> : undefined}>
                        {s.label}
                      </StepButton>
                    </Step>
                  )
                })}
              </Stepper>
            )}
          </Box>

          <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, minHeight: 320 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 1, color: '#fff', bgcolor: 'primary.main', '& svg': { fontSize: 20 } }}>{cur.icon}</Box>
              <Typography variant="h5">{cur.title}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{cur.hint}</Typography>

            {cur.id === 'client' && (
              <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
                <ToggleButtonGroup exclusive color="primary" value={mode} onChange={(_e, v: Mode | null) => { if (v) { setMode(v); if (v === 'libre') pickLead(null) } }}>
                  <ToggleButton value="lead" sx={{ flex: 1 }}><BusinessCenterOutlined fontSize="small" sx={{ mr: 1 }} />Pour un lead</ToggleButton>
                  <ToggleButton value="libre" sx={{ flex: 1 }}>Simulation libre</ToggleButton>
                </ToggleButtonGroup>
                {mode === 'lead' ? (
                  <>
                    <Autocomplete options={leads} value={lead} onChange={(_e, v) => pickLead(v)} getOptionLabel={(p) => p.company}
                      isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText="Aucun lead ouvert"
                      renderOption={(props, p) => { const { key, ...rest } = props; return <li key={key} {...rest}><Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.company}</Typography><Typography variant="caption" color="text.secondary">{[p.contact, p.city, p.need].filter(Boolean).join(' · ')}</Typography></Box></li> }}
                      renderInput={(params) => <TextField {...params} label="Rechercher un lead" autoFocus />} />
                    {lead && (
                      <Alert severity={lead.packIds.length ? 'info' : 'success'} variant="outlined">
                        {lead.packIds.length ? `${lead.company} a déjà un devis : il est repris, vous pouvez le modifier.` : `${lead.company} n’a pas encore de devis.`}
                      </Alert>
                    )}
                  </>
                ) : <Alert severity="info" variant="outlined">Chiffrage rapide sans lead : vous pourrez copier le récapitulatif à la fin.</Alert>}
              </Stack>
            )}

            {cur.category && (
              <PackChoices packs={store.packs.filter((k) => k.category === cur.category && (k.active || sel.includes(k.id)))} sel={sel} pick={cur.pick!} onToggle={(k) => toggle(k, cur.pick!)} />
            )}

            {cur.id === 'recap' && (
              <Stack spacing={2.5}>
                {chosen.length === 0 ? <Alert severity="warning" variant="outlined">Aucune prestation choisie : revenez aux étapes précédentes.</Alert> : (
                  <Card variant="outlined">
                    {chosen.map((k, i) => (
                      <Box key={k.id}>
                        {i > 0 && <Divider />}
                        <Stack direction="row" spacing={2} sx={{ px: 2, py: 1.5, alignItems: 'center' }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{STEPS.find((s) => s.category === k.category)?.label}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{eur(k.price)}{k.billing === 'monthly' ? ' /mois' : ''}</Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Card>
                )}
                <TextField label="Remise sur le one-shot (%)" type="number" value={discount || ''} sx={{ maxWidth: 240 }}
                  onChange={(e) => { setApplied(false); setDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0))) }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  {lead && (
                    <Button variant="contained" startIcon={applied ? <CheckRounded /> : undefined} disabled={!chosen.length || applied} onClick={apply}>
                      {applied ? `Appliqué à ${lead.company}` : `Appliquer à ${lead.company}`}
                    </Button>
                  )}
                  <Button variant={lead ? 'outlined' : 'contained'} disabled={!chosen.length} startIcon={<PictureAsPdfOutlined />}
                    onClick={() => { if (lead && !applied) apply(); setPdf(true) }}>
                    {lead ? 'Émettre le devis PDF' : 'Télécharger en PDF'}
                  </Button>
                  {lead && applied && <Button variant="outlined" onClick={() => drawer.open(lead.id, 'devis')}>Ouvrir la fiche</Button>}
                  <Button variant="outlined" disabled={!chosen.length} startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />}
                    onClick={async () => { try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { store.notify('Copie impossible', false) } }}>
                    {copied ? 'Copié' : 'Copier le récapitulatif'}
                  </Button>
                  <Button startIcon={<RestartAltRounded />} onClick={reset}>Nouvelle simulation</Button>
                </Stack>
                {lead && lead.packIds.length > 0 && !applied && <Typography variant="caption" color="text.secondary">Appliquer remplace le devis actuel de la fiche par cette sélection.</Typography>}
                {pdf && <QuoteDialog lead={lead} packIds={sel} discount={discount} onClose={() => setPdf(false)} />}
              </Stack>
            )}
          </Box>

          <Divider />
          <Stack direction="row" sx={{ px: { xs: 2, sm: 3 }, py: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Button startIcon={<ArrowBackRounded />} disabled={step === 0} onClick={() => setStep(step - 1)}>Précédent</Button>
            {!last && (
              <Button variant="contained" endIcon={<ArrowForwardRounded />} disabled={!canNext} onClick={() => setStep(step + 1)}>
                {cur.category && !sel.some((id) => store.packs.find((k) => k.id === id)?.category === cur.category) ? 'Passer' : 'Suivant'}
              </Button>
            )}
          </Stack>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card sx={{ position: { lg: 'sticky' }, top: 24, p: 2.5 }}>
          <Typography variant="overline" color="text.secondary">Votre devis</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }} noWrap>{lead?.company ?? (mode === 'libre' ? 'Simulation libre' : 'Aucun lead choisi')}</Typography>
          {chosen.length === 0 ? <Typography variant="body2" color="text.secondary">Les prestations choisies s’afficheront ici.</Typography> : (
            <Stack spacing={0.75}>
              {chosen.map((k) => <Stack key={k.id} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}><Typography variant="body2" noWrap>{k.name}</Typography><Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{eur(k.price)}{k.billing === 'monthly' && '/m'}</Typography></Stack>)}
            </Stack>
          )}
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="body2" color="text.secondary">One-shot{discount > 0 ? ` (-${discount} %)` : ''}</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5">{eur(oneShot)} <Typography component="span" variant="caption" color="text.secondary">HT</Typography></Typography>
                {discount > 0 && oneShotRaw > 0 && <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>{eur(oneShotRaw)}</Typography>}
              </Box>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="body2" color="text.secondary">Mensuel</Typography>
              <Typography variant="h6" color="success.main">{eur(mrr)} <Typography component="span" variant="caption">/ mois</Typography></Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Valeur 1ʳᵉ année</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{eur(oneShot + mrr * 12)} HT</Typography>
            </Stack>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  )
}

function PackChoices({ packs, sel, pick, onToggle }: { packs: Pack[]; sel: string[]; pick: 'one' | 'many'; onToggle: (k: Pack) => void }) {
  if (!packs.length) return <Alert severity="info" variant="outlined">Aucune offre active dans cette catégorie du catalogue.</Alert>
  return (
    <Grid container spacing={2}>
      {packs.map((k) => {
        const on = sel.includes(k.id)
        return (
          <Grid key={k.id} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: '100%', borderColor: on ? 'primary.main' : undefined, bgcolor: on ? 'action.selected' : undefined, transition: 'box-shadow .15s, border-color .15s' }}>
              <CardActionArea onClick={() => onToggle(k)} aria-pressed={on} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography sx={{ fontWeight: 600 }}>{k.name}</Typography>
                  <Box sx={{ color: on ? 'primary.main' : 'text.disabled', display: 'flex' }}>
                    {on ? <CheckCircleRounded fontSize="small" /> : pick === 'one' ? <RadioButtonUncheckedRounded fontSize="small" /> : <Box sx={{ width: 18, height: 18, m: '1px', borderRadius: 0.75, border: 2, borderColor: 'currentColor' }} />}
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, flex: 1 }}>{k.description}</Typography>
                <Typography variant="h6" sx={{ mt: 1.5 }}>{eur(k.price)}<Typography component="span" variant="caption" color="text.secondary">{k.billing === 'monthly' ? ' HT / mois' : ' HT'}</Typography></Typography>
              </CardActionArea>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}
