'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/supabase/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, KeyRound, Mail, Sparkles } from 'lucide-react'

type LoginStep = 'EMAIL' | 'PASSWORD'

export default function LoginForm() {
    const { supabase } = useSupabase()
    const { toast } = useToast()
    const [step, setStep] = useState<LoginStep>('EMAIL')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [hasAccount, setHasAccount] = useState(false)

    const handleEmailVerification = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setLoading(true)

        // Call RPC to check if user is allowed
        const { data, error } = await supabase.rpc('check_user_status', { user_email: email })

        if (error) {
            toast({
                title: 'Error de conexión',
                description: 'No pudimos verificar tu correo en este momento.',
                variant: 'destructive',
            })
            setLoading(false)
            return
        }

        const status = data as unknown as { allowed: boolean; has_account: boolean }

        if (status && status.allowed) {
            setHasAccount(status.has_account)
            setStep('PASSWORD')
        } else {
            // Log unauthorized attempt
            await supabase.from('unauthorized_attempts').insert({ email })

            toast({
                title: 'Acceso Denegado',
                description: 'Ya tenemos tus datos registrados. Tomaremos medidas pertinentes ante este intento de acceso no autorizado.',
                variant: 'destructive',
                duration: 8000
            })
        }
        setLoading(false)
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) return

        setLoading(true)

        if (hasAccount) {
            // Log in existing user
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast({
                    title: 'Error al iniciar sesión',
                    description: 'Contraseña incorrecta o el usuario no existe.',
                    variant: 'destructive',
                })
            } else {
                toast({
                    title: '¡Bienvenido de nuevo!',
                    description: 'Has iniciado sesión correctamente.',
                })
                window.location.href = '/dashboard'
            }
        } else {
            // Register new authorized user
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })

            if (signUpError) {
                toast({
                    title: 'Error al crear cuenta',
                    description: signUpError.message,
                    variant: 'destructive',
                })
            } else {
                // Assuming success signs them in or sends an email.
                // We will attempt to update has_account on the server-side or via an RPC function later,
                // or just rely on the user being able to log in next time.
                // For now, let's call our future RPC function if they are authed.
                const { error: sessionError } = await supabase.rpc('set_user_has_account', { user_email: email })

                toast({
                    title: 'Cuenta configurada',
                    description: 'Tu contraseña ha sido guardada. Ahora puedes entrar a la plataforma.',
                })
                // To force redirection if auto-sign-in works:
                if (!sessionError) {
                    window.location.href = '/dashboard'
                }
            }
        }
        setLoading(false)
    }

    return (
        <Card className="w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-center">Acceso Restringido</CardTitle>
                <CardDescription className="text-center">
                    {step === 'EMAIL'
                        ? 'Plataforma privada. Ingresa tu correo autorizado para continuar.'
                        : hasAccount
                            ? 'Ingresa tu contraseña para acceder a la plataforma.'
                            : 'Es tu primera vez. Crea una contraseña segura para tu cuenta.'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {step === 'EMAIL' ? (
                    <form onSubmit={handleEmailVerification} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="sr-only">Correo electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    placeholder="nombre@tucorreo.com"
                                    type="email"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    autoCorrect="off"
                                    disabled={loading}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>
                        <Button disabled={loading || !email} className="w-full">
                            {loading && <span className="mr-2 h-4 w-4 animate-spin">⏳</span>}
                            Continuar
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleAuth} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password" className="sr-only">Contraseña</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    placeholder={hasAccount ? "Contraseña" : "Crea tu contraseña"}
                                    type="password"
                                    autoComplete="current-password"
                                    disabled={loading}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep('EMAIL')}
                                disabled={loading}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Button disabled={loading || !password} className="w-full">
                                {loading && <span className="mr-2 h-4 w-4 animate-spin">⏳</span>}
                                {hasAccount ? 'Iniciar Sesión' : 'Crear Cuenta y Entrar'}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
            <CardFooter>
                <p className="px-8 text-center text-xs text-muted-foreground w-full">
                    Acceso restringido. Todo intento no autorizado será registrado.
                </p>
            </CardFooter>
        </Card>
    )
}
