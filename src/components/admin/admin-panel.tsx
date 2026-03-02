'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/components/supabase/provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShieldAlert, Trash2, KeyRound, Plus, UserCheck, Shield, FileText, Search, FileX } from 'lucide-react'
import { type Document } from '@/components/documents/document-card'

type AllowedUser = {
    id: string
    email: string
    is_active: boolean
    is_admin: boolean
    has_account: boolean
    created_at: string
}

type UnauthorizedAttempt = {
    id: string
    email: string
    attempt_time: string
}

export function AdminPanel() {
    const { supabase } = useSupabase()
    const { toast } = useToast()

    const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([])
    const [unauthorizedAttempts, setUnauthorizedAttempts] = useState<UnauthorizedAttempt[]>([])
    const [allDocuments, setAllDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [newEmail, setNewEmail] = useState('')
    const [materialSearch, setMaterialSearch] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)

        // Fetch allowed users
        const { data: usersData } = await supabase
            .from('allowed_users')
            .select('*')
            .order('created_at', { ascending: false })

        if (usersData) setAllowedUsers(usersData)

        // Fetch documents
        const { data: docsData } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (docsData) setAllDocuments(docsData)

        // Fetch unauthorized attempts
        const { data: attemptsData } = await supabase
            .from('unauthorized_attempts')
            .select('*')
            .order('attempt_time', { ascending: false })
            .limit(50)

        if (attemptsData) setUnauthorizedAttempts(attemptsData)

        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleDeleteDocument = async (doc: Document) => {
        if (confirmDeleteId !== doc.id) {
            setConfirmDeleteId(doc.id)
            setTimeout(() => setConfirmDeleteId(null), 3000)
            return
        }

        // 1. Delete from storage
        const { error: storageError } = await supabase.storage
            .from('materials')
            .remove([doc.file_path])

        if (storageError) {
            toast({ title: 'Error en Storage', description: storageError.message, variant: 'destructive' })
        }

        // 2. Delete from DB (The RLS/Triggers should handle cleanup if configured, but let's do it manually if needed)
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', doc.id)

        if (dbError) {
            toast({ title: 'Error en DB', description: dbError.message, variant: 'destructive' })
        } else {
            toast({ title: 'Material eliminado', description: 'El archivo y su registro han sido borrados.' })
            fetchData()
        }
    }

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmail) return

        const { error } = await supabase
            .from('allowed_users')
            .insert({ email: newEmail.toLowerCase() })

        if (error) {
            toast({
                title: 'Error al agregar',
                description: error.message,
                variant: 'destructive',
            })
        } else {
            toast({ title: 'Usuario agregado', description: `${newEmail} ahora tiene acceso permitido.` })
            setNewEmail('')
            fetchData()
        }
    }

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('allowed_users')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (!error) fetchData()
    }

    const handleDeleteUser = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar a este usuario de la lista blanca? (No borrará su cuenta en Auth directamente)')) return

        const { error } = await supabase
            .from('allowed_users')
            .delete()
            .eq('id', id)

        if (!error) {
            toast({ title: 'Usuario eliminado' })
            fetchData()
        }
    }

    const handleResetPassword = async (email: string) => {
        if (!confirm('Esta acción enviará un correo de recuperación al usuario. ¿Continuar?')) return

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/dashboard`,
        })

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: 'Correo enviado', description: `Se ha enviado el enlace de restablecimiento a ${email}` })
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Shield className="h-8 w-8 text-primary" />
                    Panel de Configuración
                </h1>
                <p className="text-muted-foreground mt-2">Gestiona el acceso de usuarios y monitorea los intentos no autorizados.</p>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="users">
                        <UserCheck className="h-4 w-4 mr-2" /> Usuarios Permitidos
                    </TabsTrigger>
                    <TabsTrigger value="material">
                        <FileText className="h-4 w-4 mr-2" /> Gestionar Material
                    </TabsTrigger>
                    <TabsTrigger value="intrusions">
                        <ShieldAlert className="h-4 w-4 mr-2" /> Registro de Intrusos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="border-primary/20">
                        <CardHeader>
                            <CardTitle>Usuarios Permitidos</CardTitle>
                            <CardDescription>Añade los correos que pueden iniciar sesión en la plataforma cerrada.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddUser} className="flex gap-2 mb-6">
                                <Input
                                    placeholder="ejemplo@correo.com"
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Button type="submit" disabled={!newEmail}><Plus className="h-4 w-4 mr-2" /> Añadir</Button>
                            </form>

                            <div className="rounded-md border border-primary/20 overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[600px]">
                                    <thead className="bg-primary/5 text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Email</th>
                                            <th className="px-4 py-3 font-medium">Estado</th>
                                            <th className="px-4 py-3 font-medium">Cuenta Configurada</th>
                                            <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary/10">
                                        {loading ? (
                                            <tr><td colSpan={4} className="text-center py-8">Cargando...</td></tr>
                                        ) : allowedUsers.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No hay usuarios permitidos.</td></tr>
                                        ) : (
                                            allowedUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-primary/5 transition-colors">
                                                    <td className="px-4 py-3 flex items-center gap-2">
                                                        {user.email}
                                                        {user.is_admin && <Badge variant="secondary">Admin</Badge>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={user.is_active ? "default" : "destructive"} className="cursor-pointer" onClick={() => handleToggleActive(user.id, user.is_active)}>
                                                            {user.is_active ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {user.has_account ? (
                                                            <span className="text-green-500 font-medium">Sí</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">Esperando ingreso</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {user.has_account && (
                                                                <Button size="sm" variant="outline" title="Resetear contraseña" onClick={() => handleResetPassword(user.email)}>
                                                                    <KeyRound className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {!user.is_admin && (
                                                                <Button size="sm" variant="destructive" title="Eliminar" onClick={() => handleDeleteUser(user.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="material">
                    <Card className="border-primary/20 bg-zinc-950/40 backdrop-blur-xl transition-all hover:border-primary/30">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Gestionar
                                </div>
                                <div className="relative w-full sm:w-64 group">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Buscar por título..."
                                        className="pl-9 bg-zinc-900/50 border-white/5 h-9 text-xs focus:ring-primary focus:border-primary transition-all"
                                        value={materialSearch}
                                        onChange={e => setMaterialSearch(e.target.value)}
                                    />
                                </div>
                            </CardTitle>
                            <CardDescription className="text-zinc-500">Visualiza y elimina los archivos subidos a la plataforma por cualquier usuario.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-2xl border border-white/5 overflow-x-auto bg-zinc-950/50">
                                <table className="w-full text-xs text-left min-w-[700px]">
                                    <thead className="bg-white/5 text-zinc-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Material</th>
                                            <th className="px-6 py-4 font-semibold">Tipo</th>
                                            <th className="px-6 py-4 font-semibold">Subido por</th>
                                            <th className="px-6 py-4 font-semibold text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {allDocuments.filter(d => d.title.toLowerCase().includes(materialSearch.toLowerCase())).map((m) => (
                                            <tr key={m.id} className="hover:bg-primary/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-zinc-100 group-hover:text-primary transition-colors">{m.title}</div>
                                                    <div className="text-[10px] text-zinc-500 truncate max-w-[250px] font-mono mt-1 opacity-60 group-hover:opacity-100">{m.file_path}</div>
                                                </td>
                                                <td className="px-6 py-4 capitalize text-zinc-400">
                                                    <Badge variant="outline" className="text-[10px] border-white/10 py-0 h-5">
                                                        {m.type.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500 font-medium">
                                                    {m.metadata.uploaded_by?.split('@')[0] || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-9 w-9 rounded-xl transition-all ${confirmDeleteId === m.id ? 'text-red-500 bg-red-500/10' : 'text-zinc-600 hover:text-red-400 hover:bg-red-400/10'}`}
                                                        onClick={() => handleDeleteDocument(m)}
                                                        title={confirmDeleteId === m.id ? "Click de nuevo para borrar" : "Eliminar permanentemente"}
                                                    >
                                                        {confirmDeleteId === m.id ? <Trash2 className="h-4 w-4" /> : <FileX className="h-4 w-4" />}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {allDocuments.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-20 text-zinc-600">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <FileText className="h-12 w-12 opacity-20" />
                                                        <p className="italic">No hay materiales en este momento.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="intrusions">
                    <Card className="border-destructive/20">
                        <CardHeader>
                            <CardTitle className="flex items-center text-destructive">
                                <ShieldAlert className="h-5 w-5 mr-2" />
                                Intentos No Autorizados
                            </CardTitle>
                            <CardDescription>Registro de correos que intentaron acceder a la plataforma sin permiso.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-border overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[500px]">
                                    <thead className="bg-destructive/10 text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Email Registrado</th>
                                            <th className="px-4 py-3 font-medium">Fecha y Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {loading ? (
                                            <tr><td colSpan={2} className="text-center py-8">Cargando...</td></tr>
                                        ) : unauthorizedAttempts.length === 0 ? (
                                            <tr><td colSpan={2} className="text-center py-8 text-muted-foreground">No hay intrusiones registradas.</td></tr>
                                        ) : (
                                            unauthorizedAttempts.map((attempt) => (
                                                <tr key={attempt.id} className="hover:bg-destructive/5 transition-colors">
                                                    <td className="px-4 py-3 font-medium">{attempt.email}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {new Date(attempt.attempt_time).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
