import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import CanvasDraw from 'react-canvas-draw'
import { Button } from '@/components/ui/button'
import { Trash2, Undo2, Loader2 } from 'lucide-react'
import { useSupabase } from '@/components/supabase/provider'
import { useToast } from '@/components/ui/use-toast'

interface AnnotationLayerProps {
    documentId: string
    initialData: string | null
    brushColor: string
    brushRadius: number
    mode: 'global' | 'personal'
    isDrawing: boolean
}

export interface AnnotationLayerRef {
    getSaveData: () => string
    undo: () => void
    clear: () => void
}

export const AnnotationLayer = forwardRef<AnnotationLayerRef, AnnotationLayerProps>(({
    documentId,
    initialData,
    brushColor,
    brushRadius,
    mode,
    isDrawing
}, ref) => {
    const canvasRef = useRef<CanvasDraw>(null)
    const [canvasWidth, setCanvasWidth] = useState(1200)
    const [canvasHeight, setCanvasHeight] = useState(1200)
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
        getSaveData: () => canvasRef.current?.getSaveData() || "",
        undo: () => canvasRef.current?.undo(),
        clear: () => {
            if (confirm('¿Borrar todos tus trazos?')) {
                canvasRef.current?.clear()
            }
        }
    }))

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const updateDimensions = () => {
            if (!containerRef.current?.parentElement) return

            const parent = containerRef.current.parentElement
            const width = Math.min(window.innerWidth, 1024)

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
        if (initialData && canvasRef.current && canvasHeight > 0 && isLoadedRef.current !== initialData) {
            const loadData = () => {
                try {
                    canvasRef.current?.loadSaveData(initialData, true)
                    isLoadedRef.current = initialData
                } catch (e) {
                    console.error('Failed to load drawing data', e)
                }
            }
            const timer = setTimeout(loadData, 200)
            return () => clearTimeout(timer)
        }
    }, [initialData, canvasWidth, canvasHeight])

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 z-10 flex justify-center !pointer-events-none`}
        >
            <div
                className={`w-full h-full overflow-hidden ${isDrawing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                style={{ touchAction: isDrawing ? 'pinch-zoom pan-x pan-y' : 'auto' }}
                onWheel={(e) => {
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
        </div>
    )
})

AnnotationLayer.displayName = 'AnnotationLayer'
