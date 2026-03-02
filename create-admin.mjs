import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://pybbnyzipbzhkgovaxoe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YmJueXppcGJ6aGtnb3ZheG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzE4MzksImV4cCI6MjA4ODA0NzgzOX0.yK4pwq9XllhAWvDHFdCeft51lgwK46yow_ulgOSDlHQ'
)

async function run() {
    const { data, error } = await supabase.auth.signUp({
        email: 'migueljuanguerrerot@gmail.com',
        password: 'Guerrero332008',
    })
    if (error) {
        console.error('Error in signUp:', error.message)
    } else {
        console.log('Succesfully created auth user:', data.user?.email)
    }
}
run()
