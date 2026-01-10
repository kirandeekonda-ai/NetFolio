
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

export const useAuth = () => {
    const session = useSession();
    const supabase = useSupabaseClient();

    return {
        user: session?.user ?? null,
        session,
        supabase,
        isAuthenticated: !!session,
        signOut: () => supabase.auth.signOut(),
    };
};
