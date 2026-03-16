/**
 * Système de templates d'impression personnalisables pour GestiCom
 * Permet de personnaliser les modèles d'impression (tickets, bons, etc.)
 */

export type TemplateData = {
  // Données entreprise
  ENTREPRISE_NOM?: string
  ENTREPRISE_CONTACT?: string
  ENTREPRISE_LOCALISATION?: string
  ENTREPRISE_LOGO?: string
  ENTREPRISE_PIED_DE_PAGE?: string

  // Données document
  NUMERO?: string
  DATE?: string
  HEURE?: string
  MAGASIN_CODE?: string
  MAGASIN_NOM?: string

  // Données client/fournisseur
  CLIENT_NOM?: string
  CLIENT_CONTACT?: string
  CLIENT_LOCALISATION?: string
  CLIENT_NCC?: string
  FOURNISSEUR_NOM?: string
  FOURNISSEUR_TELEPHONE?: string

  // Données lignes
  LIGNES?: string // HTML des lignes de produits
  TOTAL_HT?: string
  TOTAL_TVA?: string
  REMISE_GLOBALE?: string
  TOTAL?: string
  MONTANT_PAYE?: string
  RESTE?: string
  MODE_PAIEMENT?: string
  OBSERVATION?: string
}

/**
 * Remplacer les variables dans un template
 * Ordre : d'abord les conditionnels {VAR ? 'a' : 'b'}, puis les variables {VAR}
 */
export function replaceTemplateVariables(template: string, data: TemplateData): string {
  let result = template

  // 1. Remplacer les conditions {VAR ? 'oui' : 'non'} AVANT les variables (sinon {VAR} dans le texte casse la regex)
  result = result.replace(/\{([^?}]+)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\}/g, (_match, varName, ifTrue, ifFalse) => {
    const value = data[varName.trim() as keyof TemplateData]
    const hasValue = value != null && String(value).trim() !== ''
    return hasValue ? ifTrue : ifFalse
  })

  // 2. Remplacer toutes les variables simples
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, value != null ? String(value) : '')
  })

  return result
}

/**
 * Génère le HTML du tableau de toutes les lignes (articles) pour une facture/ticket.
 * Tous les articles achetés par le client sont affichés sur une même facture.
 */
export function generateLignesHTML(lignes: Array<{
  designation: string
  quantite: number
  prixUnitaire: number
  montant: number
}>): string {
  if (!lignes?.length) {
    return '<p style="margin: 12px 0; font-size: 12px; color: #6b7280;">Aucune ligne.</p>'
  }
  return `
    <table class="print-lignes" style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 8px; text-align: left; font-size: 12px; font-weight: bold;">Produit</th>
          <th style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold;">Qté</th>
          <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: bold;">Prix U.</th>
          <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: bold; color: #ef4444;">Remise</th>
          <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: bold;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lignes.map((l) => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; font-size: 12px;">${escapeHtml(l.designation)}</td>
            <td style="padding: 8px; text-align: center; font-size: 12px;">${l.quantite}</td>
            <td style="padding: 8px; text-align: right; font-size: 12px;">${l.prixUnitaire.toLocaleString('fr-FR')} F</td>
            <td style="padding: 8px; text-align: right; font-size: 12px; color: #ef4444;">${(l as any).remise ? `-${(l as any).remise}` : '-'}</td>
            <td style="padding: 8px; text-align: right; font-size: 12px; font-weight: bold;">${l.montant.toLocaleString('fr-FR')} F</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function escapeHtml(s: string): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Feuille de styles complète pour l'impression (aperçu écran + impression).
 * @param format 'TICKET' | 'A4'
 */
export function getPrintStyles(format: 'TICKET' | 'A4' = 'TICKET'): string {
    const isA4 = format === 'A4'
    return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${isA4 ? '40px' : '16px'};
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      font-size: ${isA4 ? '14px' : '13px'};
      line-height: 1.5;
      color: #1f2937;
      background: #f9fafb;
    }
    .print-document {
      max-width: ${isA4 ? '800px' : '320px'};
      margin: 0 auto;
      padding: ${isA4 ? '40px' : '24px'};
      background: #fff;
      border-radius: ${isA4 ? '0' : '8px'};
      box-shadow: ${isA4 ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};
      min-height: ${isA4 ? '1120px' : 'auto'};
    }
    .print-document h1, .print-document h2 { margin: 0 0 8px; font-size: 1.1em; }
    .print-document p { margin: 4px 0; }
    .print-document .print-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .print-document .print-header-logo {
      flex-shrink: 0;
    }
    .print-document .print-header-logo img {
      max-width: 80px;
      max-height: 70px;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
    }
    .print-document .print-header-text {
      flex: 1;
      min-width: 0;
    }
    .print-document .print-header h1,
    .print-document .print-header .print-entreprise-nom {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }
    .print-document .print-header .print-contact,
    .print-document .print-header .print-localisation {
      margin: 0;
      font-size: 12px;
      color: #6b7280;
    }
    .print-document .print-meta {
      margin-bottom: 16px;
      padding: 12px;
      background: #f3f4f6;
      border-radius: 6px;
      font-size: 12px;
    }
    .print-document .print-meta p { margin: 4px 0; }
    .print-document .print-meta strong { color: #374151; }
    .print-document table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
    }
    .print-document table thead {
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    .print-document table th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      color: #374151;
    }
    .print-document table th:nth-child(2) { text-align: center; }
    .print-document table th:nth-child(3),
    .print-document table th:nth-child(4) { text-align: right; }
    .print-document table td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .print-document table td:nth-child(2) { text-align: center; }
    .print-document table td:nth-child(3),
    .print-document table td:nth-child(4) { text-align: right; }
    .print-document table tbody tr:last-child td { border-bottom: none; }
    .print-document table.print-lignes tbody tr { page-break-inside: avoid; }
    .print-document .print-totals {
      margin-top: 16px;
      padding: 12px 0;
      border-top: 2px solid #e5e7eb;
      text-align: right;
      font-size: 13px;
    }
    .print-document .print-totals p { margin: 6px 0; }
    .print-document .print-totals .print-total { font-weight: 700; font-size: 14px; color: #111827; }
    .print-document .print-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
    }
    .print-document hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 16px 0;
    }
    .print-document .print-obs {
      margin-top: 12px;
      font-size: 11px;
      color: #6b7280;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }
      .print-document {
        max-width: none;
        width: 100%;
        margin: 0;
        padding: ${isA4 ? '20mm' : '5mm'};
        box-shadow: none;
        border: none;
        border-radius: 0;
      }
      .print-document * { color-adjust: exact; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page {
        size: ${isA4 ? 'A4' : '80mm auto'};
        margin: 0;
      }
    }

    /* Styles spécifiques A4 */
    .a4-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .a4-company-info h1 { font-size: 24px; color: #1e40af; margin-bottom: 8px; }
    .a4-client-info { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      border-left: 4px solid #1e40af;
    }
    .a4-client-info h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; color: #64748b; }
    .a4-client-info p { margin: 4px 0; font-size: 15px; font-weight: 600; }
    .a4-invoice-meta { text-align: right; }
    .a4-invoice-meta h2 { font-size: 28px; color: #1e40af; text-transform: uppercase; margin: 0; }
    .a4-invoice-meta p { font-size: 14px; color: #64748b; margin: 4px 0; }
  `
}

/**
 * Imprimer un document avec un template
 */
export async function printDocument(templateId: number | null, type: 'VENTE' | 'ACHAT', data: TemplateData, format: 'TICKET' | 'A4' = 'TICKET'): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Récupérer les paramètres de l'entreprise
    const paramsRes = await fetch('/api/parametres')
    let entrepriseData: { nomEntreprise?: string; contact?: string; localisation?: string; logo?: string | null; piedDePage?: string | null } = {}
    if (paramsRes.ok) {
      entrepriseData = await paramsRes.json()
    }

    // Récupérer le template
    let templateContent = ''
    let logo = ''

    if (templateId) {
      const res = await fetch(`/api/print-templates/${templateId}`)
      if (res.ok) {
        const template = await res.json()
        templateContent = template.enTete || ''
        logo = template.logo || ''
      }
    }

    // Si pas de template, utiliser le template par défaut approprié
    if (!templateContent) {
      templateContent = format === 'A4' ? getDefaultA4Template(type) : getDefaultTemplate(type)
    }

    // Ajouter les données de l'entreprise aux données du template
    data.ENTREPRISE_NOM = entrepriseData.nomEntreprise || data.ENTREPRISE_NOM || ''
    data.ENTREPRISE_CONTACT = entrepriseData.contact || data.ENTREPRISE_CONTACT || ''
    data.ENTREPRISE_LOCALISATION = entrepriseData.localisation || data.ENTREPRISE_LOCALISATION || ''
    data.ENTREPRISE_PIED_DE_PAGE = entrepriseData.piedDePage || data.ENTREPRISE_PIED_DE_PAGE || ''

    // Ajouter le logo si disponible (priorité au logo du template, sinon logo des paramètres)
    if (logo) {
      data.ENTREPRISE_LOGO = logo.startsWith('data:') ? `<img src="${logo}" alt="Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />` : logo
    } else if (entrepriseData.logo) {
      data.ENTREPRISE_LOGO = entrepriseData.logo.startsWith('data:') ? `<img src="${entrepriseData.logo}" alt="Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />` : entrepriseData.logo
    } else {
      data.ENTREPRISE_LOGO = ''
    }

    // Remplacer les variables
    const html = replaceTemplateVariables(templateContent, data)
    
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer.')
      return
    }

    const printStyles = getPrintStyles(format)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Impression - ${(data.NUMERO || 'Document').replace(/</g, '&lt;')}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="print-document">
            ${html}
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()

    // Attendre que le contenu soit chargé puis imprimer
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  } catch (error) {
    console.error('Erreur impression:', error)
    alert('Erreur lors de l\'impression.')
  }
}

/**
 * Template par défaut (HTML structuré pour le style d'impression)
 */
export function getDefaultTemplate(type: 'VENTE' | 'ACHAT'): string {
  const isVente = type === 'VENTE'
  return `
<div class="print-header">
  <div class="print-header-logo">{ENTREPRISE_LOGO}</div>
  <div class="print-header-text">
    <h1 class="print-entreprise-nom">{ENTREPRISE_NOM}</h1>
    <p class="print-contact">{ENTREPRISE_CONTACT}</p>
    <p class="print-localisation">{ENTREPRISE_LOCALISATION}</p>
  </div>
</div>
<hr>
<div class="print-meta">
  <p><strong>${isVente ? 'Ticket' : 'Bon'} N°:</strong> {NUMERO}</p>
  <p><strong>Date:</strong> {DATE} {HEURE}</p>
  <p><strong>Magasin:</strong> {MAGASIN_CODE} – {MAGASIN_NOM}</p>
  ${isVente ? `
  <p><strong>Client:</strong> {CLIENT_NOM}</p>
  {CLIENT_CONTACT ? '<p><strong>Contact:</strong> {CLIENT_CONTACT}</p>' : ''}
  {CLIENT_LOCALISATION ? '<p><strong>Localisation:</strong> {CLIENT_LOCALISATION}</p>' : ''}
  {CLIENT_NCC ? '<p><strong>NCC:</strong> {CLIENT_NCC}</p>' : ''}
  ` : '<p><strong>Fournisseur:</strong> {FOURNISSEUR_NOM}</p>'}
</div>
<hr>
{LIGNES}
<div class="print-totals">
  <p class="print-total"><strong>Total:</strong> {TOTAL}</p>
  {MONTANT_PAYE ? '<p><strong>Payé:</strong> {MONTANT_PAYE}</p>' : ''}
  {RESTE ? '<p><strong>Reste:</strong> {RESTE}</p>' : ''}
  <p><strong>Mode:</strong> {MODE_PAIEMENT}</p>
</div>
{OBSERVATION ? '<p class="print-obs">{OBSERVATION}</p>' : ''}
<hr>
<div class="print-footer">
  <p>Merci de votre visite !</p>
  <p><strong>{ENTREPRISE_NOM}</strong></p>
  {ENTREPRISE_PIED_DE_PAGE ? '<p style="margin-top: 8px; font-size: 10px;">{ENTREPRISE_PIED_DE_PAGE}</p>' : ''}
</div>
`
}

/**
 * Template Facture A4 Premium
 */
export function getDefaultA4Template(type: 'VENTE' | 'ACHAT'): string {
    const isVente = type === 'VENTE'
    return `
<div class="a4-grid">
  <div class="a4-company-info">
    <div style="margin-bottom: 20px;">{ENTREPRISE_LOGO}</div>
    <h1>{ENTREPRISE_NOM}</h1>
    <p> {ENTREPRISE_LOCALISATION}</p>
    <p> {ENTREPRISE_CONTACT}</p>
  </div>
  <div class="a4-invoice-meta">
    <h2>FACTURE</h2>
    <p><strong>N° :</strong> {NUMERO}</p>
    <p><strong>Date :</strong> {DATE}</p>
    <p><strong>Heure :</strong> {HEURE}</p>
    <div style="margin-top: 20px;" class="a4-client-info">
      <h3>Destinataire</h3>
      <p>{CLIENT_NOM}</p>
      {CLIENT_CONTACT ? '<p>{CLIENT_CONTACT}</p>' : ''}
      {CLIENT_LOCALISATION ? '<p>{CLIENT_LOCALISATION}</p>' : ''}
      {CLIENT_NCC ? '<p style="font-size: 12px; color: #64748b; margin-top: 8px;">NCC: {CLIENT_NCC}</p>' : ''}
    </div>
  </div>
</div>

<div style="margin: 30px 0;">
  <p style="font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">
    <strong>Objet :</strong> Vente de marchandises / prestations du {DATE}
  </p>
  {LIGNES}
</div>

<div style="display: flex; justify-content: flex-end; margin-top: 30px;">
  <div style="width: 300px; background: #f8fafc; padding: 20px; border-radius: 8px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span>Total Net :</span>
      <span style="font-weight: 700; font-size: 18px; color: #1e40af;">{TOTAL}</span>
    </div>
    {MONTANT_PAYE ? \`
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #10b981;">
      <span>Montant Payé :</span>
      <span>{MONTANT_PAYE}</span>
    </div>\` : ''}
    {RESTE ? \`
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #ef4444; font-weight: 600;">
      <span>Reste à Payer :</span>
      <span>{RESTE}</span>
    </div>\` : ''}
    <div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px; font-size: 12px; color: #64748b; text-align: center;">
      Mode de paiement : {MODE_PAIEMENT}
    </div>
  </div>
</div>

{OBSERVATION ? '<div style="margin-top: 40px; padding: 15px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 6px; font-size: 13px;"><p style="margin:0"><strong>Note :</strong> {OBSERVATION}</p></div>' : ''}

<div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
  <div style="text-align: center; width: 200px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px; color: #94a3b8;">
    Signature Client
  </div>
  <div style="text-align: center; width: 200px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px; color: #94a3b8;">
    Cachet de l'entreprise
  </div>
</div>

<div class="print-footer" style="margin-top: 100px;">
  <hr>
  <p>{ENTREPRISE_NOM} • {ENTREPRISE_CONTACT} • {ENTREPRISE_LOCALISATION}</p>
  {ENTREPRISE_PIED_DE_PAGE ? '<p style="font-size: 11px;">{ENTREPRISE_PIED_DE_PAGE}</p>' : ''}
</div>
`
}

export type PrintTemplateType = 'VENTE' | 'ACHAT' | 'BON_LIVRAISON' | 'FACTURE'

export interface PrintTemplate {
  id: number
  type: PrintTemplateType
  nom: string
  logo?: string // URL ou base64
  enTete?: string // HTML ou texte
  piedDePage?: string // HTML ou texte
  variables: Record<string, string> // Variables personnalisées
  actif: boolean
  createdAt: string
  updatedAt: string
}

export interface PrintData {
  numero: string
  date: string
  entreprise?: {
    nom: string
    contact: string
    localisation: string
    logo?: string
  }
  client?: {
    nom: string
    telephone?: string
    adresse?: string
  }
  fournisseur?: {
    nom: string
    telephone?: string
    adresse?: string
  }
  magasin?: {
    code: string
    nom: string
    localisation?: string
  }
  lignes: Array<{
    designation: string
    quantite: number
    prixUnitaire: number
    montant: number
  }>
  total: number
  montantPaye?: number
  reste?: number
  modePaiement?: string
  observation?: string
}

/**
 * Variables disponibles pour les templates
 */
export const PRINT_VARIABLES = {
  // Entreprise
  '{ENTREPRISE_NOM}': 'Nom de l\'entreprise',
  '{ENTREPRISE_CONTACT}': 'Contact de l\'entreprise',
  '{ENTREPRISE_LOCALISATION}': 'Localisation de l\'entreprise',
  '{ENTREPRISE_LOGO}': 'Logo de l\'entreprise',
  '{ENTREPRISE_PIED_DE_PAGE}': 'Pied de page de l\'entreprise',

  // Document
  '{NUMERO}': 'Numéro du document',
  '{DATE}': 'Date du document',
  '{HEURE}': 'Heure du document',

  // Client/Fournisseur
  '{CLIENT_NOM}': 'Nom du client',
  '{CLIENT_CONTACT}': 'Contact du client',
  '{CLIENT_LOCALISATION}': 'Localisation du client',
  '{CLIENT_NCC}': 'NCC du client',
  '{FOURNISSEUR_NOM}': 'Nom du fournisseur',

  // Magasin
  '{MAGASIN_CODE}': 'Code du magasin',
  '{MAGASIN_NOM}': 'Nom du magasin',

  // Totaux
  '{TOTAL}': 'Montant total',
  '{MONTANT_PAYE}': 'Montant payé',
  '{RESTE}': 'Reste à payer',
  '{MODE_PAIEMENT}': 'Mode de paiement',

  // Divers
  '{OBSERVATION}': 'Observation',
  '{LIGNES}': 'Liste des lignes (tableau)',
} as const

/**
 * Template par défaut pour une vente (logo à droite dans la section infos)
 */
export const DEFAULT_VENTE_TEMPLATE = `
<div class="print-header">
  <div class="print-header-logo">{ENTREPRISE_LOGO}</div>
  <div class="print-header-text">
    <h1 class="print-entreprise-nom">{ENTREPRISE_NOM}</h1>
    <p class="print-contact">{ENTREPRISE_CONTACT}</p>
    <p class="print-localisation">{ENTREPRISE_LOCALISATION}</p>
  </div>
</div>
<hr>
<div class="print-meta">
  <p><strong>Ticket N°:</strong> {NUMERO}</p>
  <p><strong>Date:</strong> {DATE} {HEURE}</p>
  <p><strong>Magasin:</strong> {MAGASIN_CODE} – {MAGASIN_NOM}</p>
  {CLIENT_NOM ? '<p><strong>Client:</strong> {CLIENT_NOM}</p>' : ''}
  {CLIENT_CONTACT ? '<p><strong>Contact:</strong> {CLIENT_CONTACT}</p>' : ''}
  {CLIENT_LOCALISATION ? '<p><strong>Localisation:</strong> {CLIENT_LOCALISATION}</p>' : ''}
  {CLIENT_NCC ? '<p><strong>NCC:</strong> {CLIENT_NCC}</p>' : ''}
</div>
<hr>
{LIGNES}
<hr>
<div class="print-totals">
  <p class="print-total"><strong>Total:</strong> {TOTAL}</p>
  {MONTANT_PAYE ? '<p><strong>Payé:</strong> {MONTANT_PAYE}</p>' : ''}
  {RESTE ? '<p><strong>Reste:</strong> {RESTE}</p>' : ''}
  <p><strong>Mode:</strong> {MODE_PAIEMENT}</p>
</div>
{OBSERVATION ? '<p class="print-obs">{OBSERVATION}</p>' : ''}
<hr>
<div class="print-footer">
  <p>Merci de votre visite !</p>
  <p><strong>{ENTREPRISE_NOM}</strong></p>
  {ENTREPRISE_PIED_DE_PAGE ? '<p style="margin-top: 8px; font-size: 10px;">{ENTREPRISE_PIED_DE_PAGE}</p>' : ''}
</div>
`
