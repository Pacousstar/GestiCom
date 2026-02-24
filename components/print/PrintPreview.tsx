'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Printer, Loader2 } from 'lucide-react'
import {
    type TemplateData,
    type PrintTemplate,
    replaceTemplateVariables,
    getPrintStyles,
    getDefaultTemplate,
    printDocument,
} from '@/lib/print-templates'

interface PrintPreviewProps {
    isOpen: boolean
    onClose: () => void
    type: 'VENTE' | 'ACHAT'
    data: TemplateData
    defaultTemplateId?: number | null
}

export default function PrintPreview({
    isOpen,
    onClose,
    type,
    data,
    defaultTemplateId,
}: PrintPreviewProps) {
    const [templates, setTemplates] = useState<PrintTemplate[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
        defaultTemplateId || null
    )
    const [loading, setLoading] = useState(false)
    const [previewHtml, setPreviewHtml] = useState('')
    const [enterpriseData, setEnterpriseData] = useState<{
        nom: string
        contact: string
        localisation: string
        logo: string | null
    }>({ nom: '', contact: '', localisation: '', logo: null })

    // Ref pour l'iframe de prévisualisation
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // Charger les templates et les infos entreprise au montage
    useEffect(() => {
        if (isOpen) {
            setLoading(true)
            Promise.all([
                fetch(`/api/print-templates?type=${type}&actif=true`).then((r) =>
                    r.ok ? r.json() : []
                ),
                fetch('/api/parametres').then((r) => (r.ok ? r.json() as Promise<Record<string, string | null>> : Promise.resolve({} as Record<string, string | null>))),
            ])
                .then(([tpls, params]) => {
                    setTemplates(tpls)
                    setEnterpriseData({
                        nom: params['nomEntreprise'] || '',
                        contact: params['contact'] || '',
                        localisation: params['localisation'] || '',
                        logo: params['logo'] || null,
                    })

                    // Si un defaultTemplateId est fourni, le sélectionner
                    if (defaultTemplateId && tpls.some((t: PrintTemplate) => t.id === defaultTemplateId)) {
                        setSelectedTemplateId(defaultTemplateId)
                    } else if (tpls.length > 0) {
                        // Sinon sélectionner le premier template actif par défaut
                        // On peut décider de ne rien sélectionner (null) pour le template par défaut du système
                        // ou le premier de la liste.
                        // Ici on garde null si pas de defaultTemplateId valide.
                    }
                })
                .finally(() => setLoading(false))
        }
    }, [isOpen, type, defaultTemplateId])

    // Générer le HTML de prévisualisation quand le template ou les données changent
    useEffect(() => {
        if (!isOpen) return

        const generatePreview = async () => {
            let templateContent = ''
            let logo = enterpriseData.logo

            if (selectedTemplateId) {
                // Chercher le contenu du template sélectionné
                // On suppose que la liste des templates contient déjà un résumé, 
                // mais on a besoin du contenu complet (enTete, piedDePage etc).
                // Si l'API liste retourne tout, c'est bon. Sinon on doit fetcher le détail.
                // Pour l'instant supposons qu'on doive fetcher le détail ou que la liste suffit.
                // D'après lib/print-templates.ts, PrintTemplate a enTete et piedDePage.
                // Vérifions si on les a dans `templates`. 
                // Si non, on recupère le détail.

                const selected = templates.find((t) => t.id === selectedTemplateId)
                if (selected) {
                    // Si le template a déjà le contenu
                    if (selected.enTete) {
                        templateContent = selected.enTete
                        if (selected.logo) logo = selected.logo
                    } else {
                        // Fetch detail
                        try {
                            const res = await fetch(`/api/print-templates/${selectedTemplateId}`)
                            if (res.ok) {
                                const detail = await res.json()
                                templateContent = detail.enTete || ''
                                if (detail.logo) logo = detail.logo
                            }
                        } catch (e) {
                            console.error("Erreur chargement template", e)
                        }
                    }
                }
            } else {
                templateContent = getDefaultTemplate(type)
            }

            if (!templateContent) templateContent = getDefaultTemplate(type)

            // Préparer les données
            const previewData = { ...data }
            previewData.ENTREPRISE_NOM = enterpriseData.nom || previewData.ENTREPRISE_NOM || ''
            previewData.ENTREPRISE_CONTACT = enterpriseData.contact || previewData.ENTREPRISE_CONTACT || ''
            previewData.ENTREPRISE_LOCALISATION = enterpriseData.localisation || previewData.ENTREPRISE_LOCALISATION || ''

            // Traitement du logo
            if (logo) {
                previewData.ENTREPRISE_LOGO = logo.startsWith('data:')
                    ? `<img src="${logo}" alt="Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />`
                    : logo
            } else {
                previewData.ENTREPRISE_LOGO = ''
            }

            const htmlContent = replaceTemplateVariables(templateContent, previewData)
            const styles = getPrintStyles()

            // Construire le document complet pour l'iframe
            const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${styles}</style>
            <style>
              body { background: transparent; padding: 0; margin: 0; }
              .print-document { box-shadow: none; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="print-document">
              ${htmlContent}
            </div>
          </body>
        </html>
      `
            setPreviewHtml(fullHtml)
        }

        generatePreview()
    }, [isOpen, selectedTemplateId, data, type, enterpriseData, templates])

    // Mettre à jour l'iframe
    useEffect(() => {
        if (iframeRef.current && previewHtml) {
            const doc = iframeRef.current.contentDocument
            if (doc) {
                doc.open()
                doc.write(previewHtml)
                doc.close()
            }
        }
    }, [previewHtml])

    const handlePrint = async () => {
        await printDocument(selectedTemplateId, type, data)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
                {/* En-tête de la modal */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Aperçu avant impression
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Corps - Colonnes */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Colonne gauche : Options */}
                    <div className="w-80 border-r bg-gray-50 p-6 flex flex-col gap-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Modèle d'impression
                            </label>
                            <select
                                value={selectedTemplateId || ''}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setSelectedTemplateId(val ? Number(val) : null)
                                }}
                                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-orange-500 focus:outline-none"
                            >
                                <option value="">(Défaut) Standard</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nom}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500">
                                Vous pouvez configurer plus de modèles dans{' '}
                                <a href="/dashboard/parametres/impression" className="text-orange-600 hover:underline">
                                    Paramètres &gt; Impression
                                </a>
                                .
                            </p>
                        </div>

                        <div className="mt-auto">
                            <button
                                onClick={handlePrint}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                            >
                                <Printer className="h-5 w-5" />
                                Imprimer
                            </button>
                        </div>
                    </div>

                    {/* Colonne droite : Aperçu */}
                    <div className="flex-1 bg-gray-200 p-8 overflow-y-auto flex items-start justify-center">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                            </div>
                        ) : (
                            <div className="w-[380px] min-h-[500px] bg-white shadow-lg rounded-sm overflow-hidden transform scale-95 origin-top">
                                {/* Iframe pour isoler le style */}
                                <iframe
                                    ref={iframeRef}
                                    title="Aperçu impression"
                                    className="w-full h-[600px] border-none"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
