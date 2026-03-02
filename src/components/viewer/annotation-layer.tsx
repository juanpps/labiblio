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
    isDrawing: boolean
    onSaveComplete?: (savedData: string) => void
}

export function AnnotationLayer({
    documentId,
    initialData,
    brushColor,
    brushRadius,
    mode,
    isDrawing,
    onSaveComplete
}: AnnotationLayerProps) {
    const canvasRef = useRef<CanvasDraw>(null)
    const { supabase, user } = useSupabase()
    const { toast } = useToast()
    const [saving, setSaving] = useState(false)
    const [canvasWidth, setCanvasWidth] = useState(1200)
    const [canvasHeight, setCanvasHeight] = useState(1200)

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const updateDimensions = () => {
            if (!containerRef.current?.parentElement) return

            const parent = containerRef.current.parentElement
            const width = Math.min(window.innerWidth, 1024)

            // Progresive height detection
            const img = parent.querySelector('img')
            const pdf = parent.querySelector('.rpv-core__viewer')

            let newHeight = 1200;
            if (img && img.complete) {
                newHeight = img.scrollHeight || img.clientHeight
            } else if (pdf) {
                const pdfContent = pdf.querySelector('.rpv-core__inner-pages')
                newHeight = pdfContent?.scrollHeight || pdf.scrollHeight || 1200
            } else {
                newHeight = parent.scrollHeight || 1200
            }

            // Solamente actualizamos si el cambio es significativo (> 5px) para evitar jitter
            setCanvasWidth(prev => Math.abs(prev - width) > 5 ? width : prev)
            setCanvasHeight(prev => Math.abs(prev - newHeight) > 5 ? newHeight : prev)
        }

        const debouncedUpdate = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(updateDimensions, 150)
        }

        const resizeObserver = new ResizeObserver(debouncedUpdate)
        if (containerRef.current?.parentElement) {
            resizeObserver.observe(containerRef.current.parentElement)
        }

        window.addEventListener('resize', debouncedUpdate)
        // Check once more after a delay for PDF rendering
        const initialTimer = setTimeout(updateDimensions, 1500)

        return () => {
            clearTimeout(timeoutId)
            clearTimeout(initialTimer)
            resizeObserver.disconnect()
            window.removeEventListener('resize', debouncedUpdate)
        }
    }, [isDrawing, initialData])

    const isLoadedRef = useRef<string | null>(null)

    useEffect(() => {
        // Only load if we have data, a ref, and dimensions are "ready" (default is 1200, so we wait for detection)
        if (initialData && canvasRef.current && canvasHeight > 0 && isLoadedRef.current !== initialData) {
            const loadData = () => {
                try {
                    canvasRef.current?.loadSaveData(initialData, true)
                    isLoadedRef.current = initialData
                    console.log("Annotations loaded successfully")
                } catch (e) {
                    console.error('Failed to load drawing data', e)
                }
            }

            // Small delay to ensure the DOM has settled after height calculation
            const timer = setTimeout(loadData, 200)
            return () => clearTimeout(timer)
        }
    }, [initialData, canvasWidth, canvasHeight]) // Dependency on height is key here

    const handleSave = async () => {
        if (!canvasRef.current || !user) return
        setSaving(true)

        const saveData = canvasRef.current.getSaveData()
        const tableName = mode === 'global' ? 'global_annotations' : 'user_annotations'

        // Solución Maestra: Manual Upsert (evita errores de restricciones de DB)
        let query = supabase.from(tableName).select('id').eq('document_id', documentId)
        if (mode === 'personal') query = query.eq('user_id', user.id)

        const { data: existing } = await query.maybeSingle()

        let error;
        if (existing) {
            const updateData: Record<string, unknown> = {
                drawing_data: saveData,
                updated_at: new Date().toISOString()
            }
            const { error: updateError } = await supabase
                .from(tableName)
                .update(updateData)
                .eq('id', existing.id)
            error = updateError
        } else {
            const insertData: Record<string, unknown> = {
                document_id: documentId,
                drawing_data: saveData,
                updated_at: new Date().toISOString()
            }
            if (mode === 'personal') {
                insertData.user_id = user.id
            }
            const { error: insertError } = await supabase
                .from(tableName)
                .insert(insertData)
            error = insertError
        }

        if (error) {
            console.error("Error saving annotations:", error)
            const isOffline = !window.navigator.onLine;
            toast({
                title: isOffline ? 'Sin conexión a Internet' : 'Error al guardar',
                description: isOffline
                    ? 'No podemos sincronizar tus trazos ahora. Se intentará de nuevo cuando recuperes la conexión.'
                    : `No se pudo guardar: ${error.message}`,
                variant: 'destructive'
            })
        } else {
            toast({
                title: mode === 'global' ? 'Sincronizado' : 'Guardado',
                description: 'Tus trazos están a salvo.',
            })
            if (onSaveComplete) onSaveComplete(saveData)
        }
        setSaving(false)
    }

    const handleClear = () => {
        if (confirm('¿Borrar todos tus trazos?')) {
            canvasRef.current?.clear()
        }
    }

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 z-10 flex justify-center !pointer-events-none`}
        >
            <div
                className={`w-full h-full overflow-hidden ${isDrawing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                style={{ touchAction: isDrawing ? 'none' : 'auto' }}
                onWheel={(e) => {
                    // Bubble scroll to parent if drawing
                    if (isDrawing) {
                        const scrollable = containerRef.current?.closest('.overflow-y-auto');
                        if (scrollable) {
                            scrollable.scrollBy({ top: e.deltaY, behavior: 'auto' });
                        }
                    }
                }}
            >
                <CanvasDraw
                    ref={canvasRef}
                    disabled={!isDrawing}
                    brushColor={brushColor}
                    brushRadius={brushRadius}
                    lazyRadius={0}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    backgroundColor="transparent"
                    hideGrid
                    loadTimeOffset={5}
                    className={`bg-transparent ${isDrawing ? 'cursor-crosshair' : ''}`}
                    style={{ background: 'transparent' }}
                />
            </div>

            {/* Acciones flotantes de la capa */}
            {isDrawing && (
                <div className="fixed bottom-10 right-4 md:right-10 flex flex-col gap-3 z-[70] pointer-events-auto">
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
            )}
        </div>
    )
}
