'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/components/supabase/provider'
import { ViewerHeader } from '@/components/viewer/viewer-header'
import { PDFViewer } from '@/components/viewer/pdf-viewer'
import { AnnotationLayer } from '@/components/viewer/annotation-layer'
import { SidePanel } from '@/components/viewer/side-panel'
import { type Document } from '@/components/documents/document-card'
import { Loader2 } from 'lucide-react'

export default function ViewerPage() {
    const { id } = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = (searchParams.get('mode') as 'global' | 'personal') || 'global'
    const { supabase, user, loading: authLoading } = useSupabase()
    const [doc, setDoc] = useState<Document | null>(null)
    const [loading, setLoading] = useState(true)
    const [drawingData, setDrawingData] = useState<string | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [brushColor, setBrushColor] = useState('#ff0000')
    const [brushRadius, setBrushRadius] = useState(2)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.push('/login')
            return
        }

        async function fetchData() {
            setLoading(true)
            setDrawingData(null) // Reset before new fetch

            try {
                // Get document
                const { data: docData, error: docError } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (docError || !docData) {
                    console.error("Doc error:", docError)
                    setLoading(false)
                    return
                }

                setDoc(docData)

                // Get annotations based on mode
                const tableName = mode === 'global' ? 'global_annotations' : 'user_annotations'
                let query = supabase.from(tableName).select('drawing_data').eq('document_id', id)

                if (mode === 'personal' && user) {
                    query = query.eq('user_id', user.id)
                }

                // maybeSingle prevents errors if no annotation exists yet
                const { data: annData, error: annError } = await query.maybeSingle()

                if (annError) {
                    console.error("Annotation fetch error:", annError)
                }

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

    if (loading || authLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Cargando material...</p>
            </div>
        )
    }

    if (!doc) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <p className="text-xl font-semibold">Material no encontrado.</p>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-950">
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
            />

            <div className="flex-1 relative overflow-hidden flex justify-center items-start">
                <div className="relative w-full max-w-5xl h-full shadow-2xl border-x border-white/5 bg-white overflow-y-auto custom-scrollbar">
                    <div className="relative w-full min-h-full flex flex-col items-center">
                        {/* Contenido: PDF o Imagen */}
                        {doc.file_path.toLowerCase().endsWith('.pdf') ? (
                            <PDFViewer file={supabase.storage.from('materials').getPublicUrl(doc.file_path).data.publicUrl} />
                        ) : (
                            <img
                                src={supabase.storage.from('materials').getPublicUrl(doc.file_path).data.publicUrl}
                                alt={doc.title}
                                className="w-full h-auto object-contain"
                            />
                        )}

                        {/* Annotation Layer (Now inside the scroll flow) */}
                        <AnnotationLayer
                            documentId={doc.id}
                            initialData={drawingData}
                            brushColor={brushColor}
                            brushRadius={brushRadius}
                            mode={mode}
                            isDrawing={isDrawing}
                            onSaveComplete={(savedData) => setDrawingData(savedData)}
                        />
                    </div>
                </div>

                {/* Side Panel for Mnemonics / Comments */}
                <SidePanel doc={doc} isDrawing={isDrawing} />
            </div>
        </div>
    )
}
