import { redirect } from 'next/navigation'

export default function LegacyUsersPage() {
    redirect('/user-management/users')
}
