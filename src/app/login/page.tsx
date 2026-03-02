import LoginForm from '@/components/auth/login-form'

export const metadata = {
    title: 'Iniciar Sesión - Biblioteca de Estudio',
    description: 'Acceso restringido para usuarios autorizados',
}

export default function LoginPage() {
    return (
        <div className="container relative flex h-screen flex-col items-center justify-center lg:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-6 w-6"
                    >
                        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                    </svg>
                    Biblioteca de Estudio
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &quot;Espacio de acceso restringido. Área exclusiva para estudiantes autorizados, con acceso a material en tiempo real y anotaciones personales.&quot;
                        </p>
                        <footer className="text-sm">Plataforma Privada</footer>
                    </blockquote>
                </div>
            </div>
            <div className="p-4 lg:p-8 h-full flex items-center">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}
