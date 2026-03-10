"use client";

import AllProducts from "@/components/AllProducts";
import BrowseByCategory from "@/components/browseByCategory";
import FeaturedProducts from "@/components/featureProducts";

import { usePaginaPrincipal } from "@/context/PaginaPrincipalContext";
import HeroSection from "@/components/heroSection";
import { useParams } from "next/navigation";
import SectionDivider from "@/components/sectionDivider";


export default function Page() {
  const { clave } = useParams(); // ✅ ahora sí puedes usar clave
  const { categorias } = usePaginaPrincipal();
  return (
    <div className="">

    <HeroSection clave={clave}/>

    <FeaturedProducts/>
    <SectionDivider/>
    {categorias.length > 0 && <BrowseByCategory />}
    
    </div>
  );
}
