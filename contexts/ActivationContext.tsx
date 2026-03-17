'use client'

import React, { createContext, useContext, useState } from 'react'

interface ActivationContextType {
    isActivated: boolean
    hwid: string
    isModalOpen: boolean
    openActivationModal: () => void
    closeActivationModal: () => void
    checkLicense: () => Promise<void>
}

const ActivationContext = createContext<ActivationContextType | undefined>(undefined)

export function ActivationProvider({ children }: { children: React.ReactNode }) {
    // FORCE ACTIVATED TO TRUE PERMANENTLY
    const [isActivated] = useState(true)
    const [hwid] = useState('GESTICOM-PRO-MASTER')
    const [isModalOpen] = useState(false)

    const checkLicense = async () => {
        // No-op
    }

    const openActivationModal = () => {}
    const closeActivationModal = () => {}

    return (
        <ActivationContext.Provider value={{ 
            isActivated, 
            hwid, 
            isModalOpen, 
            openActivationModal, 
            closeActivationModal,
            checkLicense
        }}>
            {children}
        </ActivationContext.Provider>
    )
}

export function useActivation() {
    const context = useContext(ActivationContext)
    if (context === undefined) {
        return {
            isActivated: true,
            hwid: 'GESTICOM-PRO-MASTER',
            isModalOpen: false,
            openActivationModal: () => {},
            closeActivationModal: () => {},
            checkLicense: async () => {}
        }
    }
    return context
}
