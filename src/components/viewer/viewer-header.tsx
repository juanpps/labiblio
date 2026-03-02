'use client'

import { Button } from '@/components/ui/button'
import {
    ChevronLeft,
    Pencil,
    Eraser,
    Highlighter,
    Download,
    Share2,
    Save,
    Type,
    MessageSquare,
    CheckCircle2,
    Users,
    UserCircle,
    Move
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ViewerHeaderProps {
    doc: any
    isDrawing: boolean
    setIsDrawing: (val: boolean) => void
    brushColor: string
    setBrushColor: (val: string) => void
    brushRadius: number
    setBrushRadius: (val: number) => void
    documentId: string
    mode: 'global' | 'personal'
}

export function ViewerHeader({
    doc,
    isDrawing,
    setIsDrawing,
    brushColor,
    setBrushColor,
    brushRadius,
    setBrushRadius,
    mode
}: ViewerHeaderProps) {
    const colors = [
        { name: 'Rojo', hex: '#ef4444' }, // Pencil red
        { name: 'Azul', hex: '#3b82f6' }, // Pencil blue
        { name: 'Resaltador', hex: 'rgba(234, 179, 8, 0.4)' }, // Highlighter yellow
    ]

    return (
        <TooltipProvider>
            <>
                <header className="h-14 w-full flex items-center justify-between px-4 bg-zinc-900 border-b border-white/5 text-white z-50 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white shrink-0 h-9 w-9">
                            <Link href="/dashboard">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="min-w-0 flex flex-col justify-center">
                            <h1 className="text-[10px] sm:text-xs font-bold truncate leading-tight pr-2 text-zinc-300">{doc.title}</h1>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Badge variant="outline" className={`text-[7px] sm:text-[9px] h-3 sm:h-3.5 py-0 px-1 border-none bg-white/5 ${mode === 'global' ? 'text-primary' : 'text-blue-500'}`}>
                                    {mode === 'global' ? <Users className="h-2 w-2 mr-0.5" /> : <UserCircle className="h-2 w-2 mr-0.5" />}
                                    {mode === 'global' ? 'Colectivo' : 'Mío'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar Central (Desktop only) */}
                    <div className="hidden md:flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg border border-white/5">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isDrawing ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 ${isDrawing ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-zinc-400'}`}
                                    onClick={() => setIsDrawing(!isDrawing)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mano Alzada</TooltipContent>
                        </Tooltip>

                        <div className="w-[1px] h-6 bg-white/5 mx-1" />

                        {colors.map((c) => (
                            <button
                                key={c.hex}
                                onClick={() => {
                                    setIsDrawing(true)
                                    setBrushColor(c.hex)
                                    setBrushRadius(c.hex.includes('rgba') ? 12 : 2)
                                }}
                                className={`h-6 w-6 rounded-full border-2 transition-all ${brushColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                                    }`}
                                style={{ backgroundColor: c.name === 'Resaltador' ? '#eab308' : c.hex }}
                                title={c.name}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Toggle Drawing Button (Mobile only) */}
                        <div className="flex md:hidden items-center bg-zinc-800/50 rounded-lg p-0.5 border border-white/5">
                            <Button
                                variant={!isDrawing ? 'secondary' : 'ghost'}
                                size="icon"
                                className={`h-8 w-8 ${!isDrawing ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
                                onClick={() => setIsDrawing(false)}
                            >
                                <Move className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={isDrawing ? 'secondary' : 'ghost'}
                                size="icon"
                                className={`h-8 w-8 ${isDrawing ? 'bg-primary/20 text-primary' : 'text-zinc-500'}`}
                                onClick={() => setIsDrawing(true)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white h-8 w-8">
                            <Download className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" className="hidden sm:flex gap-2 h-9 px-4 font-bold">
                            <Save className="h-4 w-4" />
                            Guardar
                        </Button>
                    </div>
                </header>

                {/* Mobile Bottom Toolbar (Hidden on Desktop) */}
                {isDrawing && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-zinc-900/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-[60] safe-area-bottom">
                        {colors.map((c) => (
                            <button
                                key={c.hex}
                                onClick={() => {
                                    setBrushColor(c.hex)
                                    setBrushRadius(c.hex.includes('rgba') ? 12 : 2)
                                }}
                                className={`h-10 w-10 rounded-full border-2 transition-all ${brushColor === c.hex ? 'border-white scale-110 shadow-2xl' : 'border-white/10 opacity-60'
                                    }`}
                                style={{ backgroundColor: c.name === 'Resaltador' ? '#eab308' : c.hex }}
                            />
                        ))}
                        <div className="w-[1px] h-8 bg-white/10" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 h-10 w-10"
                            onClick={() => setIsDrawing(false)}
                        >
                            <Eraser className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </>
        </TooltipProvider>
    )
}
