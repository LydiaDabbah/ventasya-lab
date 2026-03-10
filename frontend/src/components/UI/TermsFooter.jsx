"use client";
import React from "react";

export default function TermsFooter({
  acceptTerms,
  setAcceptTerms,
  errors = {},
  setErrors,
}) {
  return (
    <div className="space-y-3">
        {/* Terms and Conditions */}
        <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => {
                      setAcceptTerms(e.target.checked)
                      if (errors.terms) {
                        setErrors((prev) => ({ ...prev, terms: "" }))
                      }
                    }}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2 mt-1"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{" "}
                    <button type="button" className="text-black hover:text-gray-600 transition-colors font-medium">
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button type="button" className="text-black hover:text-gray-600 transition-colors font-medium">
                      Privacy Policy
                    </button>
                  </label>
                </div>
                
              </div>


      {errors && errors.terms && (
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-red-600 text-sm">{errors.terms}</span>
        </div>
      )}
    </div>
  );
}
