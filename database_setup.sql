-- ==========================================
-- 1. TABLA: ALLOWED USERS (Lista blanca)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.allowed_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    has_account BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Solo los administradores pueden leer la tabla de usuarios permitidos
CREATE POLICY "Admins can view allowed users" ON public.allowed_users
    FOR SELECT USING (
        (SELECT is_admin FROM public.allowed_users WHERE email = auth.jwt()->>'email') = true
    );

-- Solo los administradores pueden insertar/actualizar/eliminar
CREATE POLICY "Admins can manage allowed users" ON public.allowed_users
    FOR ALL USING (
        (SELECT is_admin FROM public.allowed_users WHERE email = auth.jwt()->>'email') = true
    );

-- Función segura para verificar el estado de un email (permitido y si tiene cuenta) sin exponer la lista entera
CREATE OR REPLACE FUNCTION check_user_status(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ignora RLS para poder consultar la tabla libremente desde anonimo
AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT is_active, has_account INTO user_record
    FROM public.allowed_users 
    WHERE email = user_email;

    IF FOUND AND user_record.is_active THEN
        RETURN json_build_object('allowed', true, 'has_account', user_record.has_account);
    ELSE
        RETURN json_build_object('allowed', false, 'has_account', false);
    END IF;
END;
$$;

-- Permitir a usuarios anónimos llamar a esta función
GRANT EXECUTE ON FUNCTION check_user_status(TEXT) TO anon, authenticated;

-- Función para actualizar has_account después del primer login exitoso
CREATE OR REPLACE FUNCTION set_user_has_account(user_email TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.allowed_users SET has_account = true WHERE email = user_email;
$$;

GRANT EXECUTE ON FUNCTION set_user_has_account(TEXT) TO authenticated;

-- Inserta un usuario de prueba como administrador (reemplaza esto por tu correo luego en el panel)
INSERT INTO public.allowed_users (email, is_admin)
VALUES ('admin@labiblioteca.com', true)
ON CONFLICT (email) DO NOTHING;


-- ==========================================
-- 2. TABLA: UNAUTHORIZED ATTEMPTS (Intrusos)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.unauthorized_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.unauthorized_attempts ENABLE ROW LEVEL SECURITY;

-- Permitir que cualquier usuario anónimo pueda insertar un intento (para el login)
CREATE POLICY "Anyone can insert an unauthorized attempt" ON public.unauthorized_attempts
    FOR INSERT WITH CHECK (true);

-- Solo admins pueden ver los intentos
CREATE POLICY "Admins can view unauthorized attempts" ON public.unauthorized_attempts
    FOR SELECT USING (
        (SELECT is_admin FROM public.allowed_users WHERE email = auth.jwt()->>'email') = true
    );


-- ==========================================
-- 3. TABLA: GLOBAL ANNOTATIONS (Anotaciones colaborativas)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.global_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR NOT NULL UNIQUE,
    drawing_data TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.global_annotations ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden verlas y editarlas
CREATE POLICY "Authenticated users can select global annotations" ON public.global_annotations
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Authenticated users can insert/update global annotations" ON public.global_annotations
    FOR ALL USING (auth.role() = 'authenticated');


-- ==========================================
-- 4. TABLA: PERSONAL LIBRARY (Documentos guardados por usuario)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.personal_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id VARCHAR NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, document_id)
);

ALTER TABLE public.personal_library ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver y gestionar sus propios documentos guardados
CREATE POLICY "Users can manage their personal library" ON public.personal_library
    FOR ALL USING (auth.uid() = user_id);


-- ==========================================
-- 5. TABLA: USER ANNOTATIONS (Anotaciones privadas)
-- ==========================================
-- Ya existía una política en la BD anterior, nos aseguramos de que esté estructurada correctamente:
CREATE TABLE IF NOT EXISTS public.user_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id VARCHAR NOT NULL,
    drawing_data TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, document_id)
);

ALTER TABLE public.user_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their personal annotations" ON public.user_annotations
    FOR ALL USING (auth.uid() = user_id);
