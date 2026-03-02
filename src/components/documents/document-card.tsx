'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, BookOpen, GraduationCap, Clock, BookmarkPlus, BookmarkCheck, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSupabase } from '@/components/supabase/provider'
import { useToast } from '@/components/ui/use-toast'

export type DocumentType = 'cuadernillo' | 'texto_ingles' | 'texto_lectura'

export interface Document {
    id: string
    type: DocumentType
    title: string
    file_path: string
    metadata: {
        edition?: string
        author?: string
        answers?: string[]
        uploaded_by?: string
        last_edited_by?: string
    }
    mnemonics?: string
    created_at: string
}

const typeConfig = {
    cuadernillo: {
        label: 'Cuadernillo',
        icon: BookOpen,
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    texto_ingles: {
        label: 'Inglés',
        icon: GraduationCap,
        color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    texto_lectura: {
        label: 'Lectura Crítica',
        icon: FileText,
        color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    },
}

export function DocumentCard({ doc, isSavedInitially = false, onToggleSave, isAdmin }: { doc: Document, isSavedInitially?: boolean, onToggleSave?: () => void, isAdmin?: boolean }) {
    const config = typeConfig[doc.type]
    const Icon = config.icon
    const { supabase, user } = useSupabase()
    const { toast } = useToast()
    const [isSaved, setIsSaved] = useState(isSavedInitially)
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true)
            setTimeout(() => setConfirmDelete(false), 3000)
            return
        }

        setDeleting(true)
        const { error } = await supabase.from('documents').delete().eq('id', doc.id)
        if (!error) {
            toast({ title: 'Eliminado', description: 'El documento fue eliminado definitivamente.' })
            if (onToggleSave) onToggleSave()
        } else {
            toast({ title: 'Error', description: 'No se pudo eliminar el documento', variant: 'destructive' })
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    const handleSaveToggle = async () => {
        if (!user) return
        setLoading(true)

        if (isSaved) {
            // Remove
            const { error } = await supabase
                .from('personal_library')
                .delete()
                .eq('user_id', user.id)
                .eq('document_id', doc.id)

            if (!error) {
                setIsSaved(false)
                toast({ title: 'Removido', description: 'El documento se quitó de tu biblioteca.' })
                if (onToggleSave) onToggleSave()
            }
        } else {
            // Save
            const { error } = await supabase
                .from('personal_library')
                .insert({ user_id: user.id, document_id: doc.id })

            if (!error) {
                setIsSaved(true)
                toast({ title: 'Guardado', description: 'El documento está en tu biblioteca personal.' })
                if (onToggleSave) onToggleSave()
            } else {
                toast({ title: 'Error', description: error.message, variant: 'destructive' })
            }
        }
        setLoading(false)
    }

    return (
        <Card className="group relative overflow-hidden border-primary/10 bg-card/30 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`${config.color} font-medium`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                    </Badge>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 transition-colors ${confirmDelete ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-muted-foreground hover:text-red-400'}`}
                                onClick={handleDelete}
                                disabled={deleting}
                                title={confirmDelete ? "Click de nuevo para borrar" : "Eliminar material"}
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        )}
                        <div className="flex items-center text-[10px] text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(doc.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleSaveToggle}
                            disabled={loading || !user}
                            title={isSaved ? "Quitar de mi biblioteca" : "Guardar en mi biblioteca"}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                                isSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <BookmarkPlus className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                        </Button>
                    </div>
                </div>
                <CardTitle className="line-clamp-2 text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                    {doc.title}
                </CardTitle>
                <CardDescription className="text-xs">
                    {doc.metadata.author && <span>Por {doc.metadata.author}</span>}
                    {doc.metadata.edition && <span> • {doc.metadata.edition}</span>}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Placeholder for small preview or more info */}
                <div className="h-24 w-full rounded-md bg-muted/50 flex items-center justify-center border border-dashed border-primary/5 relative overflow-hidden">
                    {doc.file_path.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/) ? (
                        <img
                            src={supabase.storage.from('materials').getPublicUrl(doc.file_path).data.publicUrl}
                            alt={doc.title}
                            className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                        />
                    ) : (
                        <Icon className="h-8 w-8 text-muted-foreground/20" />
                    )}
                    {isSaved && <div className="absolute inset-0 bg-primary/5 flex items-end p-2"><span className="text-[10px] font-medium text-primary bg-background/80 px-1.5 py-0.5 rounded backdrop-blur-sm">Guardado</span></div>}
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button asChild className="w-full" variant={isSaved ? "outline" : "default"}>
                    <Link href={`/viewer/${doc.id}?mode=global`}>
                        {isSaved ? 'Abrir (Global)' : 'Abrir Material'}
                    </Link>
                </Button>
                {isSaved && (
                    <Button asChild className="w-full" variant="default">
                        <Link href={`/viewer/${doc.id}?mode=personal`}>
                            Mi Copia (Personal)
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
