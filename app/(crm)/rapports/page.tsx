'use client'
import { DownloadRounded } from '@mui/icons-material'
import { Button, Card, CardContent, Grid, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useColorScheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { useMemo, useState } from 'react'
import { PageHeader, StatTile } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { STATUSES } from '@/lib/shared/data'
import { csvCell, dealValue, download, eur, invoiceTotals, round2, todayISO } from '@/lib/shared/utils'

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const COLORS = { light: { billed: '#5539d9', paid: '#14a38b' }, dark: { billed: '#7f6ce6', paid: '#12a892' } }

export default function RapportsPage() {
  const store = useStore()
  const { mode, systemMode } = useColorScheme()
  const palette = COLORS[(mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light']
  const thisYear = todayISO().slice(0, 4)
  const years = useMemo(() => [...new Set([thisYear, ...store.invoices.map((i) => i.issueDate.slice(0, 4)), ...store.payments.map((p) => p.date.slice(0, 4))])].sort().reverse(), [store.invoices, store.payments, thisYear])
  const [year, setYear] = useState(thisYear)

  const r = useMemo(() => {
    // Une facture annulée reste émise : son avoir (négatif) la compense à la date de l'annulation
    const inYear = store.invoices.filter((i) => i.issueDate.startsWith(year))
    const paid = store.payments.filter((p) => p.date.startsWith(year))
    const months = MONTHS.map((month, n) => {
      const key = `${year}-${String(n + 1).padStart(2, '0')}`
      return {
        month,
        billed: round2(inYear.filter((i) => i.issueDate.startsWith(key)).reduce((t, i) => t + invoiceTotals(i).ttc, 0)),
        paid: round2(paid.filter((p) => p.date.startsWith(key)).reduce((t, p) => t + p.amount, 0)),
      }
    })
    const total = (s: 'billed' | 'paid') => months.reduce((t, m) => t + m[s], 0)
    const stages = STATUSES.map((s) => ({ label: s.label, count: store.prospects.filter((p) => p.status === s.id).length }))
    const groups = (keyOf: (p: (typeof store.prospects)[number]) => string) => {
      const m = new Map<string, { name: string; leads: number; won: number; value: number }>()
      for (const p of store.prospects) {
        const name = keyOf(p) || 'Non renseigné'
        const g = m.get(name) ?? { name, leads: 0, won: 0, value: 0 }
        g.leads += 1
        if (p.status === 'gagne') { g.won += 1; g.value += dealValue(p, store.packs) }
        m.set(name, g)
      }
      return [...m.values()].sort((a, b) => b.won - a.won || b.leads - a.leads)
    }
    const decided = store.prospects.filter((p) => p.status === 'gagne' || p.status === 'perdu')
    const won = decided.filter((p) => p.status === 'gagne').length
    return { months, billed: total('billed'), paid: total('paid'), stages, sales: groups((p) => p.assignee ?? ''), sources: groups((p) => p.source), won, decided: decided.length }
  }, [store.invoices, store.payments, store.prospects, store.packs, year])

  const exportCsv = () => {
    const num = (n: number) => n.toFixed(2).replace('.', ',')
    const lines = [['Mois', 'Facturé TTC', 'Encaissé TTC'].join(';'), ...r.months.map((m) => [m.month, num(m.billed), num(m.paid)].map(csvCell).join(';'))]
    download(`rapport-${year}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8')
  }
  const fmt = (v: number | null) => (v == null ? '' : eur(v))
  const rate = (won: number, leads: number) => (leads ? `${Math.round((won / leads) * 100)} %` : '—')

  const Breakdown = ({ title, label, rows }: { title: string; label: string; rows: typeof r.sales }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: 0 }}><Typography variant="h6">{title}</Typography></CardContent>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>{label}</TableCell><TableCell align="right">Leads</TableCell><TableCell align="right">Gagnés</TableCell><TableCell align="right">Taux</TableCell><TableCell align="right">CA signé</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((g) => <TableRow key={g.name}><TableCell>{g.name}</TableCell><TableCell align="right">{g.leads}</TableCell><TableCell align="right">{g.won}</TableCell><TableCell align="right">{rate(g.won, g.leads)}</TableCell><TableCell align="right">{eur(g.value)}</TableCell></TableRow>)}
            {!rows.length && <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">Aucune donnée.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )

  return (
    <>
      <PageHeader title="Rapports" subtitle="Chiffre d’affaires, encaissements et performance commerciale."
        actions={<>
          <TextField select size="small" value={year} onChange={(e) => setYear(e.target.value)} sx={{ width: 110 }} aria-label="Année">{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
          <Button variant="outlined" startIcon={<DownloadRounded />} onClick={exportCsv}>Exporter</Button>
        </>} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile filled label="Facturé TTC" value={eur(r.billed)} sub={`Année ${year}, avoirs déduits`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Encaissé TTC" value={eur(r.paid)} sub={r.billed > 0 ? `${Math.round((r.paid / r.billed) * 100)} % du facturé` : `Année ${year}`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Taux de transformation" value={r.decided ? `${Math.round((r.won / r.decided) * 100)} %` : '—'} sub={`${r.won} gagné(s) sur ${r.decided} décidé(s)`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Leads au total" value={store.prospects.length} sub="Tout le pipeline" /></Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Facturé et encaissé par mois</Typography>
              <BarChart height={300} dataset={r.months} borderRadius={4} grid={{ horizontal: true }}
                xAxis={[{ scaleType: 'band', dataKey: 'month' }]} yAxis={[{ valueFormatter: (v: number) => eur(v), width: 70 }]}
                series={[{ dataKey: 'billed', label: 'Facturé TTC', color: palette.billed, valueFormatter: fmt }, { dataKey: 'paid', label: 'Encaissé TTC', color: palette.paid, valueFormatter: fmt }]} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Pipeline actuel</Typography>
              <BarChart height={300} layout="horizontal" dataset={r.stages} borderRadius={4} hideLegend margin={{ left: 0 }}
                yAxis={[{ scaleType: 'band', dataKey: 'label', width: 120 }]} xAxis={[{ tickMinStep: 1 }]}
                series={[{ dataKey: 'count', label: 'Leads', color: palette.billed }]} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}><Breakdown title="Performance par commercial" label="Commercial" rows={r.sales} /></Grid>
        <Grid size={{ xs: 12, lg: 6 }}><Breakdown title="Origine des leads" label="Source" rows={r.sources} /></Grid>
        <Grid size={12}>
          <Card>
            <CardContent sx={{ pb: 0 }}><Typography variant="h6">Détail mensuel</Typography></CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Mois</TableCell><TableCell align="right">Facturé TTC</TableCell><TableCell align="right">Encaissé TTC</TableCell></TableRow></TableHead>
                <TableBody>{r.months.map((m) => <TableRow key={m.month}><TableCell>{m.month}</TableCell><TableCell align="right">{eur(m.billed)}</TableCell><TableCell align="right">{eur(m.paid)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
