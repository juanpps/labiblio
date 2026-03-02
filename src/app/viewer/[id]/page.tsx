'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/components/supabase/provider'
import { ViewerHeader } from '@/components/viewer/viewer-header'
import { PDFViewer } from '@/components/viewer/pdf-viewer'
import { AnnotationLayer, type AnnotationLayerRef } from '@/components/viewer/annotation-layer'
import { SidePanel } from '@/components/viewer/side-panel'
import { type Document } from '@/components/documents/document-card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ViewerPage() {
    const { id } = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = (searchParams.get('mode') as 'global' | 'personal') || 'global'
    const { supabase, user, loading: authLoading } = useSupabase()
    const { toast } = useToast()

    const [doc, setDoc] = useState<Document | null>(null)
    const [loading, setLoading] = useState(true)
    const [drawingData, setDrawingData] = useState<string | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [brushColor, setBrushColor] = useState('#ef4444')
    const [brushRadius, setBrushRadius] = useState(2)
    const [saving, setSaving] = useState(false)

    const annotationRef = useRef<AnnotationLayerRef>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.push('/login')
            return
        }

        async function fetchData() {
            setLoading(true)
            setDrawingData(null)

            try {
                const { data: docData, error: docError } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (docError || !docData) {
                    setLoading(false)
                    return
                }

                setDoc(docData)

                const tableName = mode === 'global' ? 'global_annotations' : 'user_annotations'
                let query = supabase.from(tableName).select('drawing_data').eq('document_id', id)

                if (mode === 'personal' && user) {
                    query = query.eq('user_id', user.id)
                }

                const { data: annData } = await query.maybeSingle()
                if (annData) {
                    setDrawingData(annData.drawing_data)
                }
            } catch (err) {
                console.error("Unexpected fetch error:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id, supabase, user, authLoading, router, mode])

    const handleSave = async () => {
        if (!annotationRef.current || !user || !doc) return
        setSaving(true)

        const saveData = annotationRef.current.getSaveData()
        const tableName = mode === 'global' ? 'global_annotations' : 'user_annotations'

        let query = supabase.from(tableName).select('id').eq('document_id', doc.id)
        if (mode === 'personal') query = query.eq('user_id', user.id)

        const { data: existing } = await query.maybeSingle()

        let error;
        const timestamp = new Date().toISOString()

        if (existing) {
            const { error: updateError } = await supabase
                .from(tableName)
                .update({ drawing_data: saveData, updated_at: timestamp })
                .eq('id', existing.id)
            error = updateError
        } else {
            const insertData: any = {
                document_id: doc.id,
                drawing_data: saveData,
                updated_at: timestamp
            }
            if (mode === 'personal') insertData.user_id = user.id
            const { error: insertError } = await supabase.from(tableName).insert(insertData)
            error = insertError
        }

        if (error) {
            toast({
                title: 'Error al guardar',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: mode === 'global' ? 'Sincronizado' : 'Guardado',
                description: 'Tus cambios se han guardado correctamente.',
            })
            setDrawingData(saveData)
        }
        setSaving(false)
    }

    if (loading || authLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-zinc-400 animate-pulse font-medium">Cargando material...</p>
            </div>
        )
    }

    if (!doc) return <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-white">Material no encontrado.</div>

    return (
        <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-zinc-950 selection:bg-primary/30">
            <ViewerHeader
                doc={doc}
                isDrawing={isDrawing}
                setIsDrawing={setIsDrawing}
                brushColor={brushColor}
                setBrushColor={setBrushColor}
                brushRadius={brushRadius}
                setBrushRadius={setBrushRadius}
                documentId={doc.id}
                mode={mode}
                onSave={handleSave}
                onUndo={() => annotationRef.current?.undo()}
                onClear={() => annotationRef.current?.clear()}
                saving={saving}
            />

            <main className="flex-1 relative overflow-hidden flex justify-center items-stretch group">
                {/* Contenedor principal con scroll independiente */}
                <div className="relative flex-1 max-w-5xl h-full shadow-2xl bg-white overflow-y-auto custom-scrollbar touch-pan-y">
                    <div className="relative w-full min-h-full flex flex-col items-center origin-top transition-transform duration-200">
                        {doc.file_path.toLowerCase().endsWith('.pdf') ? (
                            <PDFViewer file={supabase.storage.from('materials').getPublicUrl(doc.file_path).data.publicUrl} />
                        ) : (
                            <img
                                src={supabase.storage.from('materials').getPublicUrl(doc.file_path).data.publicUrl}
                                alt={doc.title}
                                className="w-full h-auto object-contain select-none"
                                draggable={false}
                            />
                        )}

                        <AnnotationLayer
                            ref={annotationRef}
                            documentId={doc.id}
                            initialData={drawingData}
                            brushColor={brushColor}
                            brushRadius={brushRadius}
                            mode={mode}
                            isDrawing={isDrawing}
                        />
                    </div>
                </div>

                <SidePanel doc={doc} isDrawing={isDrawing} />
            </main>
        </div>
    )
}
