// Lazy loading utility functions
import { lazy } from 'react';

// Predefined lazy-loaded components
export const LazyFarmerDashboard = lazy(() => import('@/pages/FarmerDashboard'));
export const LazyAdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
export const LazyCropDetails = lazy(() => import('@/pages/CropDetails'));
export const LazyLogin = lazy(() => import('@/pages/Login'));
export const LazyLanding = lazy(() => import('@/pages/Landing'));
export const LazyFarmerDetailPage = lazy(() => import('@/pages/FarmerDetailPage'));
export const LazyHistory = lazy(() => import('@/pages/History'));
export const LazyCropHistory = lazy(() => import('@/pages/CropHistory'));
export const LazyAlerts = lazy(() => import('@/pages/Alerts'));
export const LazyRulesManager = lazy(() => import('@/pages/RulesManager'));
export const LazyAdminRules = lazy(() => import('@/pages/RulesManager'));
export const LazyNotFound = lazy(() => import('@/pages/NotFound'));
