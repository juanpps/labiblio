'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { type Document } from '@/components/documents/document-card'
import { Brain, MessageSquare, Info, Key, Sparkles, Send, Loader2, User, Save, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/supabase/provider'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/Textarea'

interface Comment {
    id: string
    content: string
    user_email: string
    created_at: string
    user_id: string
}

export function SidePanel({ doc: initialDoc, isDrawing }: { doc: Document, isDrawing?: boolean }) {
    const { supabase, user } = useSupabase()
    const { toast } = useToast()
    const [doc, setDoc] = useState(initialDoc)
    const [comment, setComment] = useState('')
    const [comments, setComments] = useState<Comment[]>([])
    const [loadingComments, setLoadingComments] = useState(false)
    const [sending, setSending] = useState(false)

    // Editable States
    const [isEditingMnemonics, setIsEditingMnemonics] = useState(false)
    const [tempMnemonics, setTempMnemonics] = useState(doc.mnemonics || '')
    const [newAnswer, setNewAnswer] = useState('')
    const [updatingDoc, setUpdatingDoc] = useState(false)

    const isLearningMaterial = doc.type === 'texto_ingles' || doc.type === 'texto_lectura'

    const fetchComments = useCallback(async () => {
        setLoadingComments(true)
        const { data, error } = await supabase
            .from('material_comments')
            .select('*')
            .eq('document_id', doc.id)
            .order('created_at', { ascending: true })

        if (!error && data) setComments(data)
        setLoadingComments(false)
    }, [doc.id, supabase])

    useEffect(() => {
        fetchComments()
        const channel = supabase
            .channel(`comments-${doc.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'material_comments',
                filter: `document_id=eq.${doc.id}`
            }, (payload) => {
                setComments(prev => [...prev, payload.new as Comment])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [doc.id, supabase, fetchComments])

    const handleSendComment = async () => {
        if (!comment.trim() || !user) return
        setSending(true)
        const { error } = await supabase.from('material_comments').insert({
            document_id: doc.id,
            user_id: user.id,
            user_email: user.email,
            content: comment.trim()
        })
        if (!error) setComment('')
        setSending(false)
    }

    const updateDocumentData = async (newData: any) => {
        setUpdatingDoc(true)
        const { error } = await supabase
            .from('documents')
            .update({
                ...newData,
                metadata: {
                    ...doc.metadata,
                    last_edited_by: user?.email
                }
            })
            .eq('id', doc.id)

        if (!error) {
            setDoc(prev => ({ ...prev, ...newData }))
            toast({ title: '¡Actualizado!', description: 'Los cambios son visibles para el grupo.' })
        }
        setUpdatingDoc(false)
    }

    const saveMnemonics = () => {
        updateDocumentData({ mnemonics: tempMnemonics })
        setIsEditingMnemonics(false)
    }

    const addAnswer = () => {
        if (!newAnswer.trim()) return
        const currentAnswers = doc.metadata.answers || []
        updateDocumentData({
            metadata: {
                ...doc.metadata,
                answers: [...currentAnswers, newAnswer.trim().toUpperCase()]
            }
        })
        setNewAnswer('')
    }

    const removeAnswer = (index: number) => {
        const currentAnswers = doc.metadata.answers || []
        const nextAnswers = currentAnswers.filter((_, i) => i !== index)
        updateDocumentData({
            metadata: {
                ...doc.metadata,
                answers: nextAnswers
            }
        })
    }

    return (
        <Sheet>
            {!isDrawing && (
                <SheetTrigger asChild>
                    <Button
                        variant="default"
                        size="icon"
                        className="fixed right-4 bottom-28 md:right-10 md:bottom-32 h-14 w-14 rounded-full bg-primary text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-[60]"
                    >
                        <MessageSquare className="h-7 w-7" />
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent side="right" className="w-full sm:w-[500px] bg-zinc-950 border-white/10 p-0 overflow-hidden flex flex-col">
                <SheetHeader className="p-6 border-b border-white/5">
                    <SheetTitle className="text-white flex items-center gap-2 font-bold">
                        <Brain className={`h-5 w-5 ${isLearningMaterial ? 'text-primary' : 'text-yellow-500'}`} />
                        {isLearningMaterial ? 'Módulo de Estudio' : 'Info Cuadernillo'}
                    </SheetTitle>
                    <SheetDescription className="text-zinc-500 text-xs">
                        {isLearningMaterial
                            ? 'Comparte trucos de memoria y edita la clave de respuestas.'
                            : `Subido por: ${doc.metadata.uploaded_by || 'Anónimo'}`}
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                    <TabsList className={`grid w-full ${isLearningMaterial ? 'grid-cols-3' : 'grid-cols-1'} bg-transparent border-b border-white/5 rounded-none h-12 px-6`}>
                        <TabsTrigger value="chat" className="h-10 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Debate
                        </TabsTrigger>
                        {isLearningMaterial && (
                            <>
                                <TabsTrigger value="mnemonics" className="h-10 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Trucos
                                </TabsTrigger>
                                <TabsTrigger value="answers" className="h-10 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                                    <Key className="h-4 w-4 mr-2" />
                                    Claves
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    {/* Chat Tab: Shared for both types */}
                    <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
                        <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            {loadingComments ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-zinc-700" /></div>
                            ) : comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center opacity-30 space-y-2">
                                    <MessageSquare className="h-12 w-12" />
                                    <p className="text-xs">Sin mensajes aún.</p>
                                </div>
                            ) : (
                                comments.map((c) => (
                                    <div key={c.id} className={`flex flex-col gap-1 max-w-[85%] ${c.user_id === user?.id ? 'ml-auto items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-zinc-600 px-1">{c.user_email.split('@')[0]}</span>
                                        <div className={`p-3 rounded-2xl text-sm ${c.user_id === user?.id ? 'bg-primary text-white rounded-tr-none' : 'bg-zinc-900 text-zinc-300 border border-white/5 rounded-tl-none'}`}>
                                            {c.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-zinc-950 border-t border-white/5">
                            <form onSubmit={(e) => { e.preventDefault(); handleSendComment(); }} className="flex gap-2">
                                <Input
                                    placeholder="Comentar..."
                                    className="bg-zinc-900 border-none h-11"
                                    value={comment}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComment(e.target.value)}
                                />
                                <Button size="icon" className="h-11 w-11 shrink-0" disabled={!comment.trim() || sending}>
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </form>
                        </div>
                    </TabsContent>

                    {/* Mnemonics Tab: Only for English/Reading */}
                    <TabsContent value="mnemonics" className="flex-1 p-6 space-y-4 m-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tablón de Trucos</h3>
                            {!isEditingMnemonics && (
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingMnemonics(true)} className="text-primary h-7">
                                    Editar
                                </Button>
                            )}
                        </div>

                        {isEditingMnemonics ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                <Textarea
                                    className="min-h-[150px] bg-zinc-900 border-white/10 text-sm focus:ring-primary"
                                    placeholder="Escribe trucos: 'Si dice However, es contraste'..."
                                    value={tempMnemonics}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTempMnemonics(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" className="flex-1" onClick={saveMnemonics} disabled={updatingDoc}>
                                        {updatingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Guardar para el grupo
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingMnemonics(false)}>Cancelar</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 min-h-[100px] flex flex-col">
                                {doc.mnemonics ? (
                                    <p className="text-sm text-zinc-300 italic whitespace-pre-wrap leading-relaxed">
                                        &quot;{doc.mnemonics}&quot;
                                    </p>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-6">
                                        <Sparkles className="h-8 w-8 mb-2" />
                                        <p className="text-xs">Nadie ha añadido trucos todavía.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-[10px] text-zinc-600 italic">Última edición por: {doc.metadata.last_edited_by || 'Original'}</p>
                    </TabsContent>

                    {/* Answers Tab: Only for English/Reading */}
                    <TabsContent value="answers" className="flex-1 p-6 m-0 flex flex-col">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-white/10 bg-zinc-900/40 rounded-xl px-4">
                                <AccordionTrigger className="text-white hover:no-underline font-bold text-sm py-4 uppercase">
                                    Revelar Clave de Respuestas
                                </AccordionTrigger>
                                <AccordionContent className="pb-6">
                                    <div className="grid grid-cols-4 gap-2 mb-6">
                                        {doc.metadata.answers?.map((ans, i) => (
                                            <div key={i} className="group relative flex flex-col items-center p-2 rounded-lg bg-zinc-950 border border-white/10">
                                                <span className="text-[9px] text-zinc-600 font-mono">#{i + 1}</span>
                                                <span className="text-lg font-black text-primary">{ans}</span>
                                                <button
                                                    onClick={() => removeAnswer(i)}
                                                    className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-2 w-2 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 p-2 rounded-xl bg-zinc-950 border border-white/5">
                                        <Input
                                            placeholder="Ej: A"
                                            className="h-10 bg-transparent border-none text-center font-bold"
                                            maxLength={2}
                                            value={newAnswer}
                                            onChange={e => setNewAnswer(e.target.value.toUpperCase())}
                                        />
                                        <Button size="icon" onClick={addAnswer} disabled={!newAnswer || updatingDoc} className="h-10 w-10 shrink-0">
                                            {updatingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 mt-3 text-center">Cualquier miembro del grupo puede añadir o quitar respuestas.</p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
