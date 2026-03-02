'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/supabase/provider'
import { Button } from '@/components/ui/button'
import { LogOut, Bell, Search, Settings, Upload, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export function DashboardHeader() {
    const { user, supabase } = useSupabase()
    const [isAdmin, setIsAdmin] = useState(false)

    const checkAdmin = useCallback(async () => {
        if (!user?.email) return
        const { data } = await supabase
            .from('allowed_users')
            .select('is_admin')
            .eq('email', user.email)
            .single()
        if (data?.is_admin) setIsAdmin(true)
    }, [user, supabase])

    useEffect(() => {
        checkAdmin()
    }, [checkAdmin])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/60 backdrop-blur-md">
            <div className="container px-4 flex h-16 items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold italic">B</div>
                        <span className="hidden font-bold sm:inline-block text-xl tracking-tight">Mi Biblioteca</span>
                    </Link>
                    <div className="relative flex-1 max-w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar..." className="pl-9 bg-muted/30 border-none ring-offset-background placeholder:text-muted-foreground/40 text-xs sm:text-sm h-9" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <>
                            <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10">
                                <Link href="/admin">
                                    <Settings className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Configuración</span>
                                </Link>
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                    </Button>
                    <div className="flex items-center gap-3 pl-4 border-l border-primary/10">
                        <div className="hidden text-right lg:block">
                            <p className="text-sm font-semibold leading-none">{user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                                {isAdmin ? (
                                    <><Shield className="h-3 w-3 text-primary" /> Admin</>
                                ) : (
                                    'Estudiante'
                                )}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar Sesión">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    )
}
