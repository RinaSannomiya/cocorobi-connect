import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import EmailRegistration from './components/EmailRegistration';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import BasicInfo from './components/BasicInfo';
import BasicInfoEdit from './components/BasicInfoEdit';
import ComprehensiveSurvey from './components/ComprehensiveSurvey';
import SurveyComplete from './components/SurveyComplete';
import CsvUpload from './components/CsvUpload';
import Dashboard from './components/Dashboard';
import ContactsManager from './components/ContactsManager';
import AuthCallback from './components/AuthCallback';
import VerifyOtp from './components/VerifyOtp';
import SetPassword from './components/SetPassword';
import WorkplaceExclusionEdit from './components/WorkplaceExclusionEdit';
import ProfileSettings from './components/ProfileSettings';
import SurveyEdit from './components/SurveyEdit';
import MyTagSalesSettings from './components/MyTagSalesSettings';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <Toaster position="top-center" />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<EmailRegistration />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<VerifyOtp />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/basic-info"
              element={
                <ProtectedRoute>
                  <BasicInfo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/basic-info-edit"
              element={
                <ProtectedRoute>
                  <BasicInfoEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey"
              element={
                <ProtectedRoute>
                  <ComprehensiveSurvey />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey-edit"
              element={
                <ProtectedRoute>
                  <SurveyEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey-complete"
              element={
                <ProtectedRoute>
                  <SurveyComplete />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts-manager"
              element={
                <ProtectedRoute>
                  <ContactsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/csv-upload"
              element={
                <ProtectedRoute>
                  <CsvUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workplace-exclusion-edit"
              element={
                <ProtectedRoute>
                  <WorkplaceExclusionEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile-settings"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mytag-sales-settings"
              element={
                <ProtectedRoute>
                  <MyTagSalesSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;