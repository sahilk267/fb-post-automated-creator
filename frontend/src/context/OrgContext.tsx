import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Organization } from '../api/organizations';
import { listMyOrganizations } from '../api/organizations';
import { useAuth } from './AuthContext';

interface OrgContextType {
    organizations: Organization[];
    currentOrg: Organization | null;
    setCurrentOrg: (org: Organization | null) => void;
    refreshOrganizations: () => Promise<void>;
    isLoading: boolean;
    isAdmin: boolean;
    isPro: boolean;
    isAgency: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const refreshOrganizations = async () => {
        if (!isAuthenticated) {
            setOrganizations([]);
            setCurrentOrg(null);
            return;
        }
        setIsLoading(true);
        try {
            const orgs = await listMyOrganizations();
            setOrganizations(orgs);

            // Auto-select first org if none selected, or keep selection if still available
            if (orgs.length > 0) {
                if (!currentOrg || !orgs.find(o => o.id === currentOrg.id)) {
                    setCurrentOrg(orgs[0]);
                }
            } else {
                setCurrentOrg(null);
            }
        } catch (error) {
            console.error('Failed to load organizations', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshOrganizations();
    }, [isAuthenticated]);

    const isPro = currentOrg?.subscription_tier === 'pro' || currentOrg?.subscription_tier === 'agency';
    const isAgency = currentOrg?.subscription_tier === 'agency';
    const isAdmin = true; // Placeholder: in real app, we'd check current user's role in this org

    return (
        <OrgContext.Provider value={{
            organizations,
            currentOrg,
            setCurrentOrg,
            refreshOrganizations,
            isLoading,
            isAdmin,
            isPro,
            isAgency
        }}>
            {children}
        </OrgContext.Provider>
    );
}

export function useOrg() {
    const context = useContext(OrgContext);
    if (context === undefined) {
        throw new Error('useOrg must be used within an OrgProvider');
    }
    return context;
}
