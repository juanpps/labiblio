import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignored when called from Server Components
                    }
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        redirect('/login')
    }

    // Verificar si es administrador
    const { data: adminCheck } = await supabase
        .from('allowed_users')
        .select('is_admin')
        .eq('email', session.user.email)
        .single()

    if (!adminCheck?.is_admin) {
        redirect('/dashboard') // No es un administrador, mandarlo al dashboard regular
    }

    return (
        <div className="flex flex-col min-h-screen">
            <DashboardHeader />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
