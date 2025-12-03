import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signUp, signOut, getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

interface User {
    id: string;
    email: string;
    role: 'admin' | 'viewer';
    name: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    getToken: () => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            // Simple role logic: Check if email contains 'admin' or if they are in an Admin group
            const email = attributes.email || '';
            const role = email.includes('admin') ? 'admin' : 'viewer';

            setUser({
                id: currentUser.userId,
                email: email,
                name: email.split('@')[0],
                role: role
            });
        } catch (error) {
            console.log("Not authenticated");
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            await signIn({ username: email, password });
            await checkUser();
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email
                    }
                }
            });
            alert("Registration successful! Please check your email for a verification code (or confirm in AWS Console).");
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut();
            setUser(null);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const getToken = async () => {
        try {
            const session = await fetchAuthSession();
            return session.tokens?.idToken?.toString();
        } catch (error) {
            console.error("Error fetching token:", error);
            return undefined;
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, getToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
