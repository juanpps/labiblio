'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useSupabase } from '@/components/supabase/provider'
import { FileUp, Loader2, BookOpen, GraduationCap, FileText, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MaterialType = 'cuadernillo' | 'texto_ingles' | 'texto_lectura'

export function UploadMaterial({ onUploadComplete }: { onUploadComplete?: () => void }) {
    const { supabase, user } = useSupabase()
    const { toast } = useToast()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        edition: '',
        type: 'cuadernillo' as MaterialType
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        if (selectedFiles.length > 0) {
            const validFiles = selectedFiles.filter(file => {
                if (file.size > 100 * 1024 * 1024) {
                    toast({
                        title: "Archivo muy pesado",
                        description: `El archivo ${file.name} supera los 100MB.`,
                        variant: "destructive"
                    })
                    return false
                }
                return true
            })
            setFiles(validFiles)
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (files.length === 0 || !user) return

        setLoading(true)
        let successCount = 0
        let errorCount = 0

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const isMultiple = files.length > 1
                const displayTitle = isMultiple ? `${formData.title} - Pág ${i + 1}` : formData.title

                // 1. Sanitizar el nombre del archivo
                const cleanName = file.name
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9.-]/g, '')

                const fileExt = cleanName.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
                const filePath = `${formData.type}/${fileName}`

                // 2. Subida al Storage
                const { error: uploadError } = await supabase.storage
                    .from('materials')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error(`Error uploading ${file.name}:`, uploadError)
                    errorCount++
                    continue
                }

                // 3. Crear el registro en la base de datos
                const { error: dbError } = await supabase
                    .from('documents')
                    .insert({
                        title: displayTitle,
                        type: formData.type,
                        file_path: filePath,
                        mnemonics: '',
                        metadata: {
                            author: formData.author,
                            edition: formData.edition,
                            uploaded_by: user.email,
                            last_edited_by: user.email,
                            file_size: file.size,
                            created_at: new Date().toISOString(),
                            answers: []
                        }
                    })

                if (dbError) {
                    console.error(`Error saving ${file.name} to DB:`, dbError)
                    errorCount++
                } else {
                    successCount++
                }
            }

            if (successCount > 0) {
                if (onUploadComplete) onUploadComplete()
                toast({
                    title: "¡Éxito!",
                    description: files.length > 1
                        ? `Se subieron ${successCount} archivos correctamente${errorCount > 0 ? `. (${errorCount} fallaron)` : ''}`
                        : "Material subido correctamente.",
                })
                setOpen(false)
                router.refresh()
            } else {
                throw new Error("No se pudo subir ningún archivo.")
            }
        } catch (error: any) {
            console.error('Error general al subir:', error)
            toast({
                title: "Error al subir",
                description: error.message || "No se pudo completar la subida.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
            setFiles([])
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 gap-2">
                    <FileUp className="h-5 w-5" />
                    Subir Material
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileUp className="h-6 w-6 text-primary" />
                        Subir Nuevo Material
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Los documentos subidos serán visibles para todos los del grupo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpload} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-400">Título del material *</Label>
                        <Input
                            id="title"
                            required
                            placeholder="Ej: Simulacro Inglés #4"
                            className="bg-zinc-900 border-white/5 focus:ring-primary h-11"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="author" className="text-zinc-400">Autor (opcional)</Label>
                            <Input
                                id="author"
                                placeholder="Ej: Los Tres Editores"
                                className="bg-zinc-900 border-white/5 h-11"
                                value={formData.author}
                                onChange={e => setFormData({ ...formData, author: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edition" className="text-zinc-400">Edición (opcional)</Label>
                            <Input
                                id="edition"
                                placeholder="Ej: 2024"
                                className="bg-zinc-900 border-white/5 h-11"
                                value={formData.edition}
                                onChange={e => setFormData({ ...formData, edition: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-zinc-400">Tipo de material *</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['cuadernillo', 'texto_ingles', 'texto_lectura'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1 ${formData.type === type
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'
                                        }`}
                                >
                                    {type === 'cuadernillo' && <BookOpen className="h-5 w-5" />}
                                    {type === 'texto_ingles' && <GraduationCap className="h-5 w-5" />}
                                    {type === 'texto_lectura' && <FileText className="h-5 w-5" />}
                                    <span className="text-[10px] uppercase font-bold tracking-tight">
                                        {type.replace('texto_', '')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pdf" className="text-zinc-400">Archivo PDF *</Label>
                        <div className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${files.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/20 bg-zinc-900'}`}>
                            <input
                                id="pdf"
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                required
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2 text-center">
                                {files.length > 0 ? (
                                    <>
                                        <div className="flex -space-x-2 overflow-hidden">
                                            {files.slice(0, 3).map((f, i) => (
                                                <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-zinc-950 bg-primary/20 flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                            ))}
                                            {files.length > 3 && (
                                                <div className="inline-block h-10 w-10 rounded-full ring-2 ring-zinc-950 bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
                                                    +{files.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white truncate max-w-[250px]">
                                                {files.length === 1 ? files[0].name : `${files.length} archivos seleccionados`}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <FileUp className="h-8 w-8 text-zinc-600" />
                                        <span className="text-sm text-zinc-500">Haz clic o arrastra archivos aquí</span>
                                        <span className="text-[10px] text-zinc-600 italic">Puedes seleccionar varias imágenes</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {files.some(f => f.size > 50 * 1024 * 1024) && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg animate-pulse">
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                                <p className="text-[10px] text-yellow-200 leading-tight">
                                    Algunos archivos pesan más de 50MB. Si la subida falla, intenta comprimirlos antes de subirlos.
                                </p>
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-md font-bold bg-primary hover:bg-primary/90"
                        disabled={loading || files.length === 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Subiendo material...
                            </>
                        ) : (
                            <>
                                <FileUp className="mr-2 h-5 w-5" />
                                Subir Material
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
