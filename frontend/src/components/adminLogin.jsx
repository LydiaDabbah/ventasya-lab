"use client";
import useAdminAuth from "@/hooks/useAdminAuth";
import TermsFooter from "./UI//TermsFooter";
import InputError from "./UI/inputError";
import {Eye, EyeOff } from "lucide-react"

export default function AdminAuth() {
  const {
    activeTab,
    setActiveTab,
    signinData,
    signupData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    acceptTerms,
    setAcceptTerms,
    rememberMe,
  setRememberMe,
    errors,
    setErrors,
    handleSigninChange,
    handleSignupChange,
    handleSigninSubmit,
    handleSignupSubmit,
    handleTabChange,
  } = useAdminAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => handleTabChange("signin")}
            className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-200 focus:outline-none ${
              activeTab === "signin"
                ? "bg-black text-white"
                : "bg-white text-gray-600 hover:text-black hover:bg-gray-50"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleTabChange("signup")}
            className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-200 focus:outline-none ${
              activeTab === "signup"
                ? "bg-black text-white"
                : "bg-white text-gray-600 hover:text-black hover:bg-gray-50"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto">
              {activeTab === "signin" ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L3 7v11a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V7l-7-5z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-bold text-black">
              {activeTab === "signin" ? "Admin Access" : "Create Admin Account"}
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              {activeTab === "signin"
                ? "Sign in to your admin dashboard to manage products, orders and store settings"
                : "Set up your admin account to start managing your store and products"}
            </p>
            {errors.general && (
  <div className="flex justify-center">
    <InputError message={errors.general} />
  </div>
)}
          </div>

          {/* Sign In Form */}
          {activeTab === "signin" && (
            <form onSubmit={handleSigninSubmit} noValidate className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="signin-email" className="block text-sm font-medium text-black mb-2">
                  Email
                </label>
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  value={signinData.email}
                  onChange={handleSigninChange}
                  placeholder="admin@example.com"
               
                  className="input-field"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="signin-password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={signinData.password}
                    onChange={handleSigninChange}
                    placeholder="Enter your password"
                     
                    className="input-field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
            
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                <input
  type="checkbox"
  checked={rememberMe}
  onChange={(e) => setRememberMe(e.target.checked)}
  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
/>
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-black hover:text-gray-600 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignupSubmit} noValidate className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-black mb-2">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={signupData.firstName}
                    onChange={handleSignupChange}
                    autoComplete="off"
                    placeholder="John"
                    className={`input-field ${
                        errors.firstName ? "border-red-300 bg-red-50" : "border-gray-200"
                      }`}
                  />
                 <InputError message={errors.firstName} />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-black mb-2">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={signupData.lastName}
                    onChange={handleSignupChange}
                    placeholder="Doe"
                    className={`input-field ${
                      errors.lastName ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  <InputError message={errors.lastName} />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-black mb-2">
                  Email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  value={signupData.email}
                  onChange={handleSignupChange}
                  placeholder="admin@yourstore.com"
                  className={`input-field ${
                    errors.email ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />
               <InputError message={errors.email} />
              </div>
                    {/* Business Name Field */}
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-black mb-2">
                    Business name
                  </label>
                  <input
                    id="nombreNegocio"
                    name="nombreNegocio"
                    type="text"
                    value={signupData.nombreNegocio}
                    onChange={handleSignupChange}
                    placeholder="Mi Tienda Online"
                    className={`input-field ${
                      errors.nombreNegocio ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                   <InputError message={errors.nombreNegocio} />
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
                    Phone number
                  </label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={signupData.telefono}
                    onChange={handleSignupChange}
                    placeholder="+1 (555) 123-4567"
                    className={`input-field ${
                      errors.telefono ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {errors.telefono ?<InputError message={errors.telefono} />:
                  <p className="text-xs text-gray-500 mt-1">We'll use this to contact you about your store</p>}
                </div>

              {/* Store Code Field */}
              <div>
                <label htmlFor="storeCode" className="block text-sm font-medium text-black mb-2">
                  Store code
                </label>
                <input
                  id="storeCode"
                  name="storeCode"
                  type="text"
                  value={signupData.storeCode}
                  onChange={handleSignupChange}
                  placeholder="MI-TIENDA"
                  className={`input-field uppercase ${
                    errors.storeCode ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />

{errors.storeCode ?  <InputError message={errors.storeCode} /> : (
                    <p className="text-xs text-gray-500 mt-1">Enter the URL for your store ex.MI-TIENDA</p>
                  )}
               
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={signupData.password}
                    onChange={handleSignupChange}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className={`input-field-password ${
                      errors.password ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  <InputError message={errors.password} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
    
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    placeholder="Confirm your password"
                    className={`input-field-password ${
                      errors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  <InputError message={errors.confirmPassword} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                
              </div>

              <TermsFooter
  acceptTerms={acceptTerms}
  setAcceptTerms={setAcceptTerms}
  errors={errors}
  setErrors={setErrors}
/>
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create account"
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Need help?{" "}
              <button className="text-black hover:text-gray-600 transition-colors font-medium">
                Contact support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>)}