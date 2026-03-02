import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = {
    title: 'Admin Configuración - Biblioteca PWA',
    description: 'Gestión de usuarios y accesos autorizados',
}

export default function AdminPage() {
    return (
        <div className="flex-1 bg-background">
            <AdminPanel />
        </div>
    )
}
