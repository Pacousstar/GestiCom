const cron = require('node-cron')
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

const prisma = new PrismaClient()

// Exécution planifiée : toutes les heures, on vérifie si la condition est remplie.
// Cela permet de ne pas rater le backup si l'application n'est ouverte qu'en journée.
cron.schedule('0 * * * *', async () => {
    try {
        const p = await prisma.parametre.findFirst()
        if (!p || !p.backupAuto) return

        const backupDir = path.join(__dirname, '..', 'backups')
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }

        const lockPath = path.join(backupDir, '.last_backup')
        let lastBackupTime = 0
        if (fs.existsSync(lockPath)) {
            lastBackupTime = parseInt(fs.readFileSync(lockPath, 'utf8'), 10)
        }

        const now = Date.now()
        const diffHours = (now - lastBackupTime) / (1000 * 60 * 60)

        let shouldBackup = false
        if (p.backupFrequence === 'QUOTIDIEN' && diffHours >= 20) shouldBackup = true
        if (p.backupFrequence === 'HEBDOMADAIRE' && diffHours >= (24 * 7) - 4) shouldBackup = true
        if (p.backupFrequence === 'MENSUEL' && diffHours >= (24 * 28)) shouldBackup = true

        if (!shouldBackup) return

        console.log('[CRON] Démarrage de la sauvegarde automatique...')

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const dbPath = path.join(__dirname, '..', 'prisma', 'gesticom.db')
        const backupFile = path.join(backupDir, `gesticom_backup_${timestamp}.db`)

        // Sauvegarde LOCALE (prioritaire)
        fs.copyFileSync(dbPath, backupFile)
        console.log(`[CRON] Backup local créé avec succès : ${backupFile}`)

        // Sauvegarde CLOUD (par email)
        if (p.backupDestination === 'EMAIL' && p.backupEmailDest) {
            if (!p.smtpHost || !p.smtpUser || !p.smtpPass) {
                console.warn('[CRON] Backup EMAIL échoué : Configuration SMTP manquante.')
            } else {
                const transporter = nodemailer.createTransport({
                    host: p.smtpHost,
                    port: p.smtpPort || 465,
                    secure: p.smtpPort === 465,
                    auth: { user: p.smtpUser, pass: p.smtpPass }
                })

                await transporter.sendMail({
                    from: `"${p.nomEntreprise || 'GestiCom Automates'}" <${p.smtpUser}>`,
                    to: p.backupEmailDest,
                    subject: `Sauvegarde Automatique GestiCom - ${new Date().toLocaleDateString('fr-FR')}`,
                    text: 'Bonjour, \\n\\nVeuillez trouver ci-joint la sauvegarde automatique de votre base de données GestiCom. Ce fichier peut être restauré en cas de problème technique.\\n\\nCordialement,\\nGestiCom',
                    attachments: [
                        { filename: `gesticom_backup_${timestamp}.db`, path: backupFile }
                    ]
                })
                console.log('[CRON] Backup envoyé par email avec succès à ' + p.backupEmailDest)
            }
        } else if (p.backupDestination === 'GDRIVE') {
            console.log('[CRON] Destination GDrive sélectionnée, mais le module attend la configuration API. Sauvegarde locale uniquement gardée.')
        }

        // Mettre à jour l'horodatage du dernier backup
        fs.writeFileSync(lockPath, now.toString(), 'utf8')

    } catch (e) {
        console.error('[CRON] Erreur lors de la sauvegarde automatique:', e)
    }
})

console.log('[CRON] Service de sauvegarde de GestiCom initialisé.')
