import { useContext } from 'react'

import { AuthContext } from '@contexts/AuthContext'

export function UseAuth() {
    const context = useContext(AuthContext)

    return context
}