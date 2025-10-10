/**
 * Route-based Code Splitting
 * Intelligent route-based code splitting strategies
 */

import { lazy, ComponentType } from 'react';
import { createLazyComponent } from './codeSplitting';
import { logger } from '@/lib/logger';

// ===== ROUTE DEFINITIONS =====

export interface RouteConfig {
    path: string;
    component: () => Promise<{ default: ComponentType<any> }>;
    preload?: boolean;
    priority?: 'high' | 'normal' | 'low';
    chunkName?: string;
}

// ===== ROUTE CHUNKS =====

export const routeChunks: RouteConfig[] = [
    {
        path: '/',
        component: () => import('@/pages/Dashboard'),
        preload: true,
        priority: 'high',
        chunkName: 'dashboard'
    },
    {
        path: '/deals',
        component: () => import('@/pages/Deals'),
        preload: true,
        priority: 'high',
        chunkName: 'deals'
    },
    {
        path: '/companies',
        component: () => import('@/pages/Companies'),
        preload: true,
        priority: 'high',
        chunkName: 'companies'
    },
    {
        path: '/people',
        component: () => import('@/pages/People'),
        preload: false,
        priority: 'normal',
        chunkName: 'people'
    },
    {
        path: '/quotes',
        component: () => import('@/pages/Quotes'),
        preload: false,
        priority: 'normal',
        chunkName: 'quotes'
    },
    {
        path: '/orders',
        component: () => import('@/pages/Orders'),
        preload: false,
        priority: 'normal',
        chunkName: 'orders'
    },
    {
        path: '/invoices',
        component: () => import('@/pages/Invoices'),
        preload: false,
        priority: 'normal',
        chunkName: 'invoices'
    },
    {
        path: '/settings',
        component: () => import('@/pages/Settings'),
        preload: false,
        priority: 'low',
        chunkName: 'settings'
    }
];

// ===== LAZY COMPONENTS =====

export const LazyDashboard = createLazyComponent(
    () => import('@/pages/Dashboard'),
    { preload: true, preloadDelay: 0 }
);

export const LazyDeals = createLazyComponent(
    () => import('@/pages/Deals'),
    { preload: true, preloadDelay: 100 }
);

export const LazyCompanies = createLazyComponent(
    () => import('@/pages/Companies'),
    { preload: true, preloadDelay: 200 }
);

export const LazyPeople = createLazyComponent(
    () => import('@/pages/People'),
    { preload: false }
);

export const LazyQuotes = createLazyComponent(
    () => import('@/pages/Quotes'),
    { preload: false }
);

export const LazyOrders = createLazyComponent(
    () => import('@/pages/Orders'),
    { preload: false }
);

export const LazyInvoices = createLazyComponent(
    () => import('@/pages/Invoices'),
    { preload: false }
);

export const LazySettings = createLazyComponent(
    () => import('@/pages/Settings'),
    { preload: false }
);

// ===== ROUTE PRELOADING =====

export function preloadRoute(path: string): Promise<void> {
    const route = routeChunks.find(r => r.path === path);
    if (!route) {
        return Promise.reject(new Error(`Route not found: ${path}`));
    }

    return route.component();
}

export function preloadHighPriorityRoutes(): Promise<void[]> {
    const highPriorityRoutes = routeChunks
        .filter(route => route.priority === 'high' && route.preload)
        .map(route => route.component());

    return Promise.all(highPriorityRoutes);
}

export function preloadRouteOnHover(path: string, delay: number = 300): () => void {
    let timeoutId: NodeJS.Timeout;

    return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            preloadRoute(path).catch(error => {
                logger.warn(`Failed to preload route ${path}:`, error);
            });
        }, delay);
    };
}

// ===== ROUTE ANALYSIS =====

export function analyzeRouteSplitting(): {
    totalRoutes: number;
    preloadedRoutes: number;
    highPriorityRoutes: number;
    recommendations: string[];
} {
    const totalRoutes = routeChunks.length;
    const preloadedRoutes = routeChunks.filter(route => route.preload).length;
    const highPriorityRoutes = routeChunks.filter(route => route.priority === 'high').length;

    const recommendations: string[] = [];

    if (preloadedRoutes < totalRoutes * 0.3) {
        recommendations.push('Consider preloading more routes for better perceived performance');
    }

    if (highPriorityRoutes > totalRoutes * 0.5) {
        recommendations.push('Consider reducing high priority routes to focus on critical paths');
    }

    return {
        totalRoutes,
        preloadedRoutes,
        highPriorityRoutes,
        recommendations
    };
}

export default {
    routeChunks,
    LazyDashboard,
    LazyDeals,
    LazyCompanies,
    LazyPeople,
    LazyQuotes,
    LazyOrders,
    LazyInvoices,
    LazySettings,
    preloadRoute,
    preloadHighPriorityRoutes,
    preloadRouteOnHover,
    analyzeRouteSplitting
};
