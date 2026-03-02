'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/components/supabase/provider'
import { DashboardHeader } from '@/components/dashboard/header'
import { DocumentCard, type Document } from '@/components/documents/document-card'
import { UploadMaterial } from '@/components/documents/upload-material'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, GraduationCap, FileText, Sparkles, BookMarked, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
    const { supabase, user } = useSupabase()
    const [documents, setDocuments] = useState<Document[]>([])
    const [savedDocIds, setSavedDocIds] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    const fetchDocuments = useCallback(async () => {
        if (!user) return

        const [docsResponse, savedResponse] = await Promise.all([
            supabase.from('documents').select('*').order('created_at', { ascending: false }),
            supabase.from('personal_library').select('document_id').eq('user_id', user.id)
        ])

        if (!docsResponse.error && docsResponse.data) {
            setDocuments(docsResponse.data)
        }
        if (!savedResponse.error && savedResponse.data) {
            setSavedDocIds(savedResponse.data.map(s => s.document_id))
        }
        setLoading(false)
    }, [supabase, user])

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
        fetchDocuments()
        checkAdmin()
    }, [fetchDocuments, checkAdmin])

    const filterDocs = (type: string) => {
        if (type === 'all') return documents
        if (type === 'saved') return documents.filter(doc => savedDocIds.includes(doc.id))
        return documents.filter((doc) => doc.type === type)
    }

    const newestDocs = documents.slice(0, 4)

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <DashboardHeader />
            <main className="container py-8 space-y-10">

                {/* Sección 1: Lecturas Dinámicas (Inglés y Lectura Crítica) */}
                <section className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-white">Lecturas Dinámicas</h2>
                                <p className="text-sm text-zinc-500">Práctica de Inglés y Lectura con mnemotecnias y claves.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <Button variant="outline" asChild className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                                    <Link href="/admin">
                                        <Shield className="h-4 w-4 mr-2" />
                                        Panel Admin
                                    </Link>
                                </Button>
                            )}
                            <UploadMaterial onUploadComplete={fetchDocuments} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-[280px] w-full rounded-2xl bg-muted/20" />
                            ))
                        ) : documents.filter(d => d.type === 'texto_ingles' || d.type === 'texto_lectura').length === 0 ? (
                            <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl bg-zinc-900/20">
                                <p className="text-zinc-500 italic">No hay lecturas registradas.</p>
                            </div>
                        ) : (
                            documents.filter(d => d.type === 'texto_ingles' || d.type === 'texto_lectura').map((doc) => (
                                <DocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    isSavedInitially={savedDocIds.includes(doc.id)}
                                    onToggleSave={fetchDocuments}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Sección 2: Cuadernillos Oficiales */}
                <section className="space-y-6 pt-10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-yellow-500/10">
                                <BookOpen className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-white">Cuadernillos Oficiales</h2>
                                <p className="text-sm text-zinc-500">Material de práctica general, rayado y comentarios.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-[280px] w-full rounded-2xl bg-muted/20" />
                            ))
                        ) : documents.filter(d => d.type === 'cuadernillo').length === 0 ? (
                            <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl bg-zinc-900/20">
                                <p className="text-zinc-500 italic">No hay cuadernillos registrados.</p>
                            </div>
                        ) : (
                            documents.filter(d => d.type === 'cuadernillo').map((doc) => (
                                <DocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    isSavedInitially={savedDocIds.includes(doc.id)}
                                    onToggleSave={fetchDocuments}
                                />
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
