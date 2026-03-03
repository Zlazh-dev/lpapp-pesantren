'use client'

import { useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

// Key stored in sessionStorage. sessionStorage is tab-scoped:
// - Survives page navigation and refresh within the same tab ✓
// - Cleared automatically when the tab or browser window is closed ✓
// This means: if the session cookie still exists but this key is missing,
// the tab was closed and reopened with a stale session → force sign-out.
export const TAB_SESSION_KEY = 'lpapp_tab_session'

/**
 * Drop this into any authenticated layout.
 * It enforces "session ends when tab closes" by checking for a sessionStorage
 * marker that is set by the login page after a successful signIn().
 */
export default function TabSessionGuard() {
    const { status } = useSession()

    useEffect(() => {
        if (status === 'loading') return

        if (status === 'authenticated') {
            const marker = sessionStorage.getItem(TAB_SESSION_KEY)
            if (!marker) {
                // Session cookie is valid but tab was closed and reopened.
                // Sign out silently and redirect back to login.
                signOut({ callbackUrl: '/login' })
            }
        }

        if (status === 'unauthenticated') {
            // Clean up marker if it somehow outlasted the session
            sessionStorage.removeItem(TAB_SESSION_KEY)
        }
    }, [status])

    // Renders nothing — purely a side-effect component
    return null
}
