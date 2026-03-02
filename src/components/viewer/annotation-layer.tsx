'use client'

import { useRef, useEffect, useState } from 'react'
import CanvasDraw from 'react-canvas-draw'
import { Button } from '@/components/ui/button'
import { Save, Trash2, Undo2, Loader2, Check } from 'lucide-react'
import { useSupabase } from '@/components/supabase/provider'
import { useToast } from '@/components/ui/use-toast'

interface AnnotationLayerProps {
    documentId: string
    initialData: string | null
    brushColor: string
    brushRadius: number
    mode: 'global' | 'personal'
}

export function AnnotationLayer({
    documentId,
    initialData,
    brushColor,
    brushRadius,
    mode
}: AnnotationLayerProps) {
    const canvasRef = useRef<CanvasDraw>(null)
    const { supabase, user } = useSupabase()
    const { toast } = useToast()
    const [saving, setSaving] = useState(false)
    const [canvasWidth, setCanvasWidth] = useState(1200)

    useEffect(() => {
        const updateWidth = () => {
            const width = Math.min(window.innerWidth, 1024) // 1024 es el max-w-5xl
            setCanvasWidth(width)
        }

        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    useEffect(() => {
        if (initialData && canvasRef.current) {
            try {
                canvasRef.current.loadSaveData(initialData, true)
            } catch (e) {
                console.error('Failed to load drawing data', e)
            }
        }
    }, [initialData, canvasWidth]) // Re-load when width changes

    const handleSave = async () => {
        if (!canvasRef.current || !user) return
        setSaving(true)

        const saveData = canvasRef.current.getSaveData()
        const tableName = mode === 'global' ? 'global_annotations' : 'user_annotations'

        const upsertData: Record<string, unknown> = {
            document_id: documentId,
            drawing_data: saveData,
            updated_at: new Date().toISOString()
        }

        if (mode === 'personal') {
            upsertData.user_id = user.id
        }

        const { error } = await supabase
            .from(tableName)
            .upsert(upsertData, {
                onConflict: mode === 'global' ? 'document_id' : 'document_id,user_id'
            })

        if (error) {
            toast({
                title: 'Error al guardar',
                description: 'Revisa tu conexión a internet.',
                variant: 'destructive'
            })
        } else {
            toast({
                title: mode === 'global' ? 'Sincronizado' : 'Guardado',
                description: 'Tus trazos están a salvo.',
            })
        }
        setSaving(false)
    }

    const handleClear = () => {
        if (confirm('¿Borrar todos tus trazos?')) {
            canvasRef.current?.clear()
        }
    }

    return (
        <div className="absolute inset-0 z-10 pointer-events-auto flex justify-center overflow-hidden">
            <CanvasDraw
                key={canvasWidth} // Force re-render on width change to resize
                ref={canvasRef}
                brushColor={brushColor}
                brushRadius={brushRadius}
                lazyRadius={0}
                canvasWidth={canvasWidth}
                canvasHeight={8000}
                backgroundColor="transparent"
                hideGrid
                loadTimeOffset={5}
                className="cursor-crosshair bg-transparent"
                style={{ background: 'transparent' }}
            />

            {/* Acciones flotantes de la capa */}
            <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 flex flex-col gap-3 z-[70]">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => canvasRef.current?.undo()}
                    className="bg-zinc-900/80 backdrop-blur border-white/10 hover:bg-zinc-800 text-white shadow-2xl h-10 w-10 rounded-full"
                >
                    <Undo2 className="h-5 w-5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClear}
                    className="bg-zinc-900/80 backdrop-blur border-white/10 hover:bg-zinc-800 text-red-400 shadow-2xl h-10 w-10 rounded-full"
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={`shadow-2xl h-12 w-12 rounded-full transition-all ${saving ? 'bg-zinc-700' : 'bg-primary hover:scale-110 active:scale-95'
                        }`}
                >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Save className="h-5 w-5 text-white" />}
                </Button>
            </div>
        </div>
    )
}
