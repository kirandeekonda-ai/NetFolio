import { Layout } from '@/components/layout/Layout';
import { UserSettings } from '@/components/UserSettings';
import { CategoryManager } from '@/components/CategoryManager';
import { Auth } from '@/components/Auth';
import { supabase } from '@/utils/supabase';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';

const ProfilePage: NextPage = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">User Profile</h1>
          <p className="text-neutral-500">Manage your settings and preferences.</p>
        </div>
        <UserSettings />
        <CategoryManager />
      </div>
    </Layout>
  );
};

export default ProfilePage;
