"use client";

import AllProducts from "@/components/AllProducts";



import { useParams } from "next/navigation";

  
export default function Page() {
  const { clave } = useParams(); // ✅ ahora sí puedes usar clave

  return (
    <div className="">

    <AllProducts/>
    </div>
  );
}
