import { useState } from "react";
import { useRouter } from "next/navigation";

export default function useAdminAuth() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("signin");
  const [signinData, setSigninData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    telefono: "",
    nombreNegocio: "",
    email: "",
    password: "",
    confirmPassword: "",
    storeCode: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
const [rememberMe, setRememberMe] = useState(false);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 8;

  const validateSignin = () => {
    const newErrors = {};
    if (!signinData.email) newErrors.email = "Email is required";
    else if (!validateEmail(signinData.email)) newErrors.email = "Invalid email address";

    if (!signinData.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors = {};

    if (!signupData.firstName) newErrors.firstName = "First name is required";
    if (!signupData.lastName) newErrors.lastName = "Last name is required";
    if (!signupData.telefono) newErrors.telefono = "Phone number is required";
    if (!signupData.nombreNegocio) newErrors.nombreNegocio = "Store name is required";

    if (!signupData.email) newErrors.email = "Email is required";
    else if (!validateEmail(signupData.email)) newErrors.email = "Invalid email address";

    if (!signupData.nombreNegocio) newErrors.nombreNegocio = "Store name is required";
    
    if (!signupData.telefono) newErrors.telefono = "Phone number is required"
    else if (!/^\+?[\d\s\-$$$$]{10,}$/.test(signupData.telefono)) newErrors.telefono = "Please enter a valid phone number"
    
    if (!signupData.storeCode) newErrors.storeCode = "Store code is required";
    else if (signupData.storeCode.length < 4) newErrors.storeCode = "Min 4 characters";

    if (!signupData.password) newErrors.password = "Password is required";
    else if (!validatePassword(signupData.password)) newErrors.password = "Min 8 characters";

    if (!signupData.confirmPassword) newErrors.confirmPassword = "Please confirm password";
    else if (signupData.password !== signupData.confirmPassword) newErrors.confirmPassword = "Passwords don't match";

    if (!acceptTerms) newErrors.terms = "Please accept the terms and conditions";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSigninChange = (e) => {
    const { name, value } = e.target;
    setSigninData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSigninSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({}); // limpia errores previos
  
    try {
      const res = await fetch("http://localhost:8000/vendedores/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signinData),
      });
  
      const data = await res.json();
      console.log("Login response:", data);
  
      if (res.ok) {
        // ✅ Guarda en localStorage o sessionStorage según rememberMe
        if (rememberMe) {
          localStorage.setItem("token", data.access_token);
        } else {
          sessionStorage.setItem("token", data.access_token);
        }
  
        window.location.href = "/adminPanel";
      } else {
        // SIEMPRE mostrar "Invalid credentials" sin importar el error
        setErrors({ general: "Invalid credentials" });
      }
    } catch (err) {
      setErrors({ general: "Connection error" });
    }
  
    setIsLoading(false);
  };
  
  
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // inicia loading antes de validar
  
    const isValid = validateSignup();
    if (!isValid) {
      setIsLoading(false); // 🔥 detiene loading si la validación falla
      return;
    }
  
    setErrors({});
  
    try {
      const res = await fetch("http://localhost:8000/vendedores/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: signupData.firstName + " " + signupData.lastName,
          telefono: signupData.telefono,
          email: signupData.email,
          nombre_negocio: signupData.nombreNegocio,
          clave: signupData.storeCode.toLowerCase(),
          password: signupData.password,
        }),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        // ✅ Limpiar formulario
        setSignupData({
          firstName: "",
          lastName: "",
          telefono: "",
          nombreNegocio: "",
          email: "",
          password: "",
          confirmPassword: "",
          storeCode: "",
        });
      
        // ✅ Cambiar a tab de login
        setActiveTab("signin");
      
        // ✅ Mensaje opcional de éxito
        setErrors({ general: "Cuenta creada exitosamente. Inicia sesión." });
      
      } else {
        if (Array.isArray(data.detail)) {
            const fieldErrors = {};
            data.detail.forEach((err) => {
              fieldErrors[err.loc[1] || "general"] = err.msg;
            });
            setErrors(fieldErrors);
          } else {
            // Si el error menciona 'clave' o 'store code' lo mandas ahí
            if (data.detail.includes("clave") || data.detail.includes("URL")) {
              setErrors({ storeCode: data.detail });
            } else {
              setErrors({ general: data.detail || "Signup failed" });
            }
          }
      }
    } catch (err) {
      setErrors({ general: "Connection error" });
    }
  
    setIsLoading(false); // 🔥 siempre detiene loading al final
  };
  

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors({});
  };

  return {
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
  };
}
